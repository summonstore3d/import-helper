import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { podeGerenciarUsuarios } from "@/lib/permissoes";

const NIVEIS_VALIDOS = ["admin", "gerente", "vendedor"] as const;
type NivelValido = (typeof NIVEIS_VALIDOS)[number];

export type ResultadoAcao =
  | { ok: true; email?: string }
  | { ok: false; erro: string };

function traduzErro(msg?: string): string {
  const m = (msg ?? "").toLowerCase();
  if (m.includes("pwned") || m.includes("leaked") || m.includes("known"))
    return "Esta senha aparece em vazamentos de dados públicos e não é aceita por segurança. Use uma senha mais forte ou o botão Gerar senha.";
  if (m.includes("at least") || m.includes("too short") || m.includes("should be"))
    return `A senha não atende aos requisitos: ${msg}`;
  if (m.includes("already") || m.includes("registered"))
    return "Este e-mail já tem conta. Ajuste o nível dele na lista abaixo.";
  if (m.includes("rate limit") || m.includes("security purposes"))
    return "Muitas tentativas seguidas. Aguarde um minuto e tente de novo.";
  return msg ? `Não foi possível concluir: ${msg}` : "Não foi possível concluir a operação.";
}

/** Só administradores criam contas e redefinem senhas. */
async function nivelDoChamado(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<NivelValido | null> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.role as NivelValido | undefined) ?? null;
}

function emailDoToken(claims: unknown): string | null {
  const email = (claims as { email?: unknown }).email;
  return typeof email === "string" ? email : null;
}

export const criarUsuario = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        email: z.string().trim().email("Informe um e-mail válido.").toLowerCase(),
        password: z.string().min(8, "A senha inicial precisa ter pelo menos 8 caracteres."),
        role: z.enum(NIVEIS_VALIDOS),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<ResultadoAcao> => {
    const meuNivel = await nivelDoChamado(context.supabase, context.userId);
    if (!podeGerenciarUsuarios(meuNivel)) {
      return { ok: false, erro: "Só administradores podem adicionar usuários." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: novo, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error || !novo.user) {
      return { ok: false, erro: traduzErro(error?.message) };
    }

    const { error: erroPapel } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: novo.user.id, user_email: data.email, role: data.role });
    if (erroPapel) {
      await supabaseAdmin.auth.admin.deleteUser(novo.user.id);
      return { ok: false, erro: "Não foi possível definir o nível da conta. Tente de novo." };
    }

    await context.supabase.from("audit_log").insert({
      user_id: context.userId,
      user_email: emailDoToken(context.claims),
      module: "Acessos",
      record_label: data.email,
      field_name: "nível",
      previous_value: "—",
      new_value: data.role,
      reason: "Conta criada pelo administrador",
    });

    return { ok: true, email: data.email };
  });

export const redefinirSenha = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        user_id: z.string().uuid("Conta inválida."),
        password: z.string().min(8, "A nova senha precisa ter pelo menos 8 caracteres."),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<ResultadoAcao> => {
    const meuNivel = await nivelDoChamado(context.supabase, context.userId);
    if (!podeGerenciarUsuarios(meuNivel)) {
      return { ok: false, erro: "Só administradores podem redefinir senha." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: alvo, error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      password: data.password,
      email_confirm: true,
    });
    if (error || !alvo.user) {
      return { ok: false, erro: traduzErro(error?.message) };
    }

    const emailAlvo = alvo.user.email ?? data.user_id;
    await context.supabase.from("audit_log").insert({
      user_id: context.userId,
      user_email: emailDoToken(context.claims),
      module: "Acessos",
      record_label: emailAlvo,
      field_name: "senha",
      previous_value: "—",
      new_value: "redefinida",
      reason: "Redefinição de senha pelo administrador",
    });

    return { ok: true, email: emailAlvo };
  });

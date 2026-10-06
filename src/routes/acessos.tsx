import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel, Td, Th } from "@/components/ui-kit";
import { ABAS } from "@/components/AppShell";
import { NIVEIS, type Nivel } from "@/lib/acesso";

export const Route = createFileRoute("/acessos")({
  head: () => ({
    meta: [
      { title: "Níveis de acesso — Ferramenta de Precificação" },
      { name: "description", content: "Defina quais telas cada nível de acesso pode ver e o nível de cada usuário." },
      { property: "og:title", content: "Níveis de acesso — Ferramenta de Precificação" },
      { property: "og:description", content: "Controle de telas por nível: administrador, gerente e vendedor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Acessos,
});

type Usuario = { user_id: string; user_email: string | null; role: Nivel };

function Acessos() {
  const [perms, setPerms] = useState<Set<string>>(new Set());
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [meuId, setMeuId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const [{ data: p }, { data: u }, { data: me }] = await Promise.all([
      supabase.from("role_permissions").select("role,tab"),
      supabase.from("user_roles").select("user_id,user_email,role").order("created_at"),
      supabase.auth.getUser(),
    ]);
    setPerms(new Set((p ?? []).map((r) => `${r.role}|${r.tab}`)));
    setUsuarios((u ?? []) as Usuario[]);
    setMeuId(me.user?.id ?? null);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function alternar(role: Nivel, tab: string) {
    const chave = `${role}|${tab}`;
    const tem = perms.has(chave);
    const { error } = tem
      ? await supabase.from("role_permissions").delete().eq("role", role).eq("tab", tab)
      : await supabase.from("role_permissions").insert({ role, tab });
    if (error) return toast.error("Não foi possível salvar. Só administradores podem alterar acessos.");
    const novo = new Set(perms);
    if (tem) novo.delete(chave);
    else novo.add(chave);
    setPerms(novo);
    window.dispatchEvent(new Event("acessos-alterados"));
  }

  async function mudarNivel(u: Usuario, role: Nivel) {
    if (u.user_id === meuId && role !== "admin") {
      const admins = usuarios.filter((x) => x.role === "admin").length;
      if (admins <= 1) return toast.error("Você é o único administrador. Defina outro antes de mudar seu nível.");
    }
    const { error } = await supabase.from("user_roles").update({ role }).eq("user_id", u.user_id);
    if (error) return toast.error("Não foi possível alterar o nível.");
    setUsuarios((l) => l.map((x) => (x.user_id === u.user_id ? { ...x, role } : x)));
    toast.success("Nível atualizado.");
    window.dispatchEvent(new Event("acessos-alterados"));
  }

  return (
    <>
      <PageHeader
        titulo="Níveis de acesso"
        descricao="Marque quais telas cada nível pode ver. Novas contas entram como Vendedor; altere o nível de cada pessoa abaixo."
      />
      <div className="space-y-6">
        <Panel titulo="Telas por nível" bodyClassName="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <Th>Tela</Th>
                {NIVEIS.map((n) => (
                  <Th key={n.id} className="text-center">{n.nome}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ABAS.map((a) => (
                <tr key={a.to} className="border-t border-border">
                  <Td>{a.label}</Td>
                  {NIVEIS.map((n) => {
                    const travado = n.id === "admin" && a.to === "/acessos";
                    return (
                      <Td key={n.id} className="text-center">
                        <input
                          type="checkbox"
                          aria-label={`${a.label} — ${n.nome}`}
                          className="size-4 accent-primary"
                          checked={travado || perms.has(`${n.id}|${a.to}`)}
                          disabled={travado}
                          onChange={() => void alternar(n.id, a.to)}
                        />
                      </Td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel titulo="Usuários" subtitulo="Contas que já entraram no sistema" bodyClassName="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <Th>E-mail</Th>
                <Th>Nível</Th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.user_id} className="border-t border-border">
                  <Td>
                    {u.user_email ?? "—"}
                    {u.user_id === meuId ? <span className="ml-2 text-xs text-muted-foreground">(você)</span> : null}
                  </Td>
                  <Td>
                    <select
                      value={u.role}
                      onChange={(e) => void mudarNivel(u, e.target.value as Nivel)}
                      className="rounded-sm border border-input bg-background px-2 py-1 text-sm"
                    >
                      {NIVEIS.map((n) => (
                        <option key={n.id} value={n.id}>{n.nome}</option>
                      ))}
                    </select>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </>
  );
}

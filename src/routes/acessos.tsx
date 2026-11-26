import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, KeyRound, RefreshCw, Trash2, UserPlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel, Td, Th } from "@/components/ui-kit";
import { ABAS } from "@/components/AppShell";
import { NIVEIS, useAcesso, type Nivel } from "@/lib/acesso";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { gerarSenhaInicial, podeExcluirUsuario, podeGerenciarUsuarios } from "@/lib/permissoes";
import { criarUsuario, excluirUsuario, redefinirSenha } from "@/lib/usuarios.functions";

export const Route = createFileRoute("/acessos")({
  head: () => ({
    meta: [
      { title: "Níveis de acesso — Ferramenta de Precificação" },
      { name: "description", content: "Adicione usuários, defina quais telas cada nível de acesso pode ver e o nível de cada pessoa." },
      { property: "og:title", content: "Níveis de acesso — Ferramenta de Precificação" },
      { property: "og:description", content: "Controle de telas por nível: administrador, gerente e vendedor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Acessos,
});

type Usuario = { user_id: string; user_email: string | null; role: Nivel };

function FormNovoUsuario({ onCriado }: { onCriado: () => void }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nivel, setNivel] = useState<Nivel>("vendedor");
  const [mostrar, setMostrar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setAviso(null);
    setEnviando(true);
    const senhaEnviada = senha;
    const r = await criarUsuario({ data: { email, password: senha, role: nivel } });
    setEnviando(false);
    if (!r.ok) {
      setAviso({ tipo: "erro", texto: r.erro });
      return;
    }
    const nivelNome = NIVEIS.find((n) => n.id === nivel)?.nome ?? nivel;
    setAviso({
      tipo: "ok",
      texto: `${r.email} foi criada com nível ${nivelNome}. Senha inicial: ${senhaEnviada} — anote e envie para essa pessoa.`,
    });
    setEmail("");
    setSenha("");
    setNivel("vendedor");
    onCriado();
  }

  return (
    <form
      onSubmit={enviar}
      className="space-y-3 border-b border-border bg-secondary/40 px-4 py-3"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[240px] flex-1 flex-col gap-1">
          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            E-mail
          </span>
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nome@dagostini.ind.br"
            autoComplete="off"
          />
        </label>

        <label className="flex min-w-[220px] flex-1 flex-col gap-1">
          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            Senha inicial
          </span>
          <div className="flex items-center gap-1">
            <Input
              type={mostrar ? "text" : "password"}
              required
              minLength={8}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="mínimo 8 caracteres"
              autoComplete="new-password"
              className="font-mono"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title={mostrar ? "Ocultar senha" : "Mostrar senha"}
              onClick={() => setMostrar((v) => !v)}
            >
              {mostrar ? <EyeOff /> : <Eye />}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              title="Gerar senha forte"
              onClick={() => {
                setSenha(gerarSenhaInicial());
                setMostrar(true);
              }}
            >
              <RefreshCw />
            </Button>
          </div>
        </label>

        <label className="flex w-[170px] flex-col gap-1">
          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            Nível
          </span>
          <select
            value={nivel}
            onChange={(e) => setNivel(e.target.value as Nivel)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            {NIVEIS.map((n) => (
              <option key={n.id} value={n.id}>
                {n.nome}
              </option>
            ))}
          </select>
        </label>

        <Button type="submit" disabled={enviando}>
          <UserPlus />
          {enviando ? "Adicionando…" : "Adicionar usuário"}
        </Button>
      </div>

      {aviso ? (
        <p
          className={
            aviso.tipo === "ok"
              ? "rounded-md border border-green/40 bg-green-soft px-3 py-2 text-xs text-accent-foreground"
              : "rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          }
        >
          {aviso.texto}
        </p>
      ) : null}
    </form>
  );
}

function RenegociacaoSenha({
  alvo,
  onFechar,
  onFeito,
}: {
  alvo: Usuario;
  onFechar: () => void;
  onFeito: () => void;
}) {
  const [senha, setSenha] = useState(gerarSenhaInicial());
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function confirmar() {
    setErro(null);
    setSalvando(true);
    const r = await redefinirSenha({ data: { user_id: alvo.user_id, password: senha } });
    setSalvando(false);
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    toast.success(`Nova senha de ${alvo.user_email ?? "usuário"} definida.`);
    onFeito();
    onFechar();
  }

  return (
    <tr className="border-t border-border bg-secondary/40">
      <Td colSpan={3} className="py-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-foreground">
            Nova senha de {alvo.user_email ?? alvo.user_id}:
          </span>
          <Input
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-[220px] font-mono"
            autoComplete="new-password"
          />
          <Button size="sm" onClick={() => setSenha(gerarSenhaInicial())} variant="outline">
            <RefreshCw /> Gerar
          </Button>
          <Button size="sm" onClick={() => void confirmar()} disabled={salvando}>
            <KeyRound /> {salvando ? "Salvando…" : "Definir senha"}
          </Button>
          <Button size="sm" variant="ghost" onClick={onFechar}>
            <X /> Cancelar
          </Button>
        </div>
        {erro ? <p className="mt-1 text-xs text-destructive">{erro}</p> : null}
      </Td>
    </tr>
  );
}

function Acessos() {
  const acesso = useAcesso();
  const [perms, setPerms] = useState<Set<string>>(new Set());
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [meuId, setMeuId] = useState<string | null>(null);
  const [formAberto, setFormAberto] = useState(false);
  const [renegando, setRenegando] = useState<Usuario | null>(null);
  const [excluirAlvo, setExcluirAlvo] = useState<Usuario | null>(null);
  const [excluindo, setExcluindo] = useState(false);

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
    if (error) {
      toast.error("Não foi possível salvar. Só administradores podem alterar acessos.");
      return;
    }
    const novo = new Set(perms);
    if (tem) novo.delete(chave);
    else novo.add(chave);
    setPerms(novo);
    window.dispatchEvent(new Event("acessos-alterados"));
  }

  async function mudarNivel(u: Usuario, role: Nivel) {
    if (u.user_id === meuId && role !== "admin") {
      const admins = usuarios.filter((x) => x.role === "admin").length;
      if (admins <= 1) {
        toast.error("Você é o único administrador. Defina outro antes de mudar seu nível.");
        return;
      }
    }
    const { error } = await supabase.from("user_roles").update({ role }).eq("user_id", u.user_id);
    if (error) {
      toast.error("Não foi possível alterar o nível.");
      return;
    }
    setUsuarios((l) => l.map((x) => (x.user_id === u.user_id ? { ...x, role } : x)));
    toast.success("Nível atualizado.");
    window.dispatchEvent(new Event("acessos-alterados"));
  }

  const ehAdmin = podeGerenciarUsuarios(acesso.nivel);

  async function confirmarExclusao() {
    if (!excluirAlvo) return;
    setExcluindo(true);
    const r = await excluirUsuario({ data: { user_id: excluirAlvo.user_id } });
    setExcluindo(false);
    if (!r.ok) {
      toast.error(r.erro);
      return;
    }
    toast.success(`${r.email ?? "Conta"} foi excluída.`);
    setExcluirAlvo(null);
    void carregar();
    window.dispatchEvent(new Event("acessos-alterados"));
  }

  return (
    <>
      <PageHeader
        titulo="Níveis de acesso"
        descricao="Adicione usuários, marque quais telas cada nível pode ver e ajuste o nível de cada pessoa. Novas contas criadas por aqui já entram com a senha inicial que você definir."
      />
      <div className="space-y-6">
        <Panel
          titulo="Usuários"
          subtitulo="Contas que já podem entrar no sistema"
          bodyClassName="p-0"
          acoes={
            ehAdmin ? (
              <Button
                size="sm"
                variant={formAberto ? "secondary" : "default"}
                onClick={() => setFormAberto((v) => !v)}
              >
                {formAberto ? <X /> : <UserPlus />}
                {formAberto ? "Fechar" : "Adicionar usuário"}
              </Button>
            ) : null
          }
        >
          {ehAdmin && formAberto ? (
            <FormNovoUsuario
              onCriado={() => {
                void carregar();
                window.dispatchEvent(new Event("acessos-alterados"));
              }}
            />
          ) : null}

          <table className="w-full text-sm">
            <thead>
              <tr>
                <Th>E-mail</Th>
                <Th>Nível</Th>
                {ehAdmin ? <Th align="right">Ações</Th> : null}
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.user_id} className="border-t border-border">
                  <Td>
                    {u.user_email ?? "—"}
                    {u.user_id === meuId ? (
                      <span className="ml-2 text-xs text-muted-foreground">(você)</span>
                    ) : null}
                  </Td>
                  <Td>
                    <select
                      value={u.role}
                      onChange={(e) => void mudarNivel(u, e.target.value as Nivel)}
                      className="rounded-sm border border-input bg-background px-2 py-1 text-sm"
                    >
                      {NIVEIS.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.nome}
                        </option>
                      ))}
                    </select>
                  </Td>
                  {ehAdmin ? (
                    <Td align="right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setRenegando((atual) => (atual?.user_id === u.user_id ? null : u))}
                        >
                          <KeyRound />
                          {renegando?.user_id === u.user_id ? "Fechar" : "Redefinir senha"}
                        </Button>
                        {podeExcluirUsuario(acesso.nivel, u.user_id, meuId) ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setExcluirAlvo(u)}
                          >
                            <Trash2 />
                            Excluir
                          </Button>
                        ) : null}
                      </div>
                    </Td>
                  ) : null}
                </tr>
              ))}
              {renegando ? (
                <RenegociacaoSenha
                  alvo={renegando}
                  onFechar={() => setRenegando(null)}
                  onFeito={() => void carregar()}
                />
              ) : null}
            </tbody>
          </table>
        </Panel>

        <Panel titulo="Telas por nível" bodyClassName="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <Th>Tela</Th>
                {NIVEIS.map((n) => (
                  <Th key={n.id} className="text-center">
                    {n.nome}
                  </Th>
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
      </div>

      <AlertDialog
        open={excluirAlvo !== null}
        onOpenChange={(aberto) => {
          if (!aberto && !excluindo) setExcluirAlvo(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta conta?</AlertDialogTitle>
            <AlertDialogDescription>
              {excluirAlvo?.user_email ?? "Esta conta"} perde o acesso na hora e não consegue
              entrar de novo até você criar outra conta para ela. O histórico de alterações
              feitas por essa pessoa continua guardado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluindo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={excluindo}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void confirmarExclusao();
              }}
            >
              <Trash2 />
              {excluindo ? "Excluindo…" : "Excluir conta"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

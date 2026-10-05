import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { LogIn, LogOut, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

const traduzir = (msg: string) => {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail pelo link enviado antes de entrar.";
  if (m.includes("already registered")) return "Este e-mail já tem conta. Use a opção Entrar.";
  if (m.includes("password")) return "A senha precisa ter pelo menos 6 caracteres.";
  return msg;
};

export function AuthPanel({ compact = false, onSignedIn }: { compact?: boolean; onSignedIn?: () => void }) {
  const [modo, setModo] = useState<"entrar" | "cadastrar">("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setUserEmail(session?.user.email ?? null);
      if (event === "SIGNED_IN") onSignedIn?.();
    });
    return () => data.subscription.unsubscribe();
  }, [onSignedIn]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setEnviando(true);
    if (modo === "entrar") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage({ tipo: "erro", texto: traduzir(error.message) });
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + "/acesso" },
      });
      if (error) setMessage({ tipo: "erro", texto: traduzir(error.message) });
      else if (!data.session)
        setMessage({
          tipo: "ok",
          texto: `Conta criada. Enviamos um link de confirmação para ${email}. Abra o e-mail, confirme e depois entre aqui.`,
        });
    }
    setEnviando(false);
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/acesso" });
    if (result.error) setMessage({ tipo: "erro", texto: result.error.message });
  }

  if (userEmail) {
    return (
      <div className={compact ? "flex items-center gap-2" : "space-y-2"}>
        <span className="max-w-48 truncate text-xs font-semibold text-foreground">{userEmail}</span>
        <Button type="button" variant="ghost" size="sm" onClick={() => void supabase.auth.signOut()}>
          <LogOut className="size-4" /> Sair
        </Button>
      </div>
    );
  }

  if (compact)
    return (
      <div className="flex items-center gap-2">
        <span className="hidden text-xs text-muted-foreground sm:inline">Modo consulta</span>
        <Button asChild size="sm">
          <Link to="/acesso" search={{ redirect: pathname === "/acesso" ? "/" : pathname }}>
            <LogIn /> Entrar
          </Link>
        </Button>
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 rounded-md border border-border p-1" role="tablist">
        {(["entrar", "cadastrar"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={modo === m}
            onClick={() => { setModo(m); setMessage(null); }}
            className={`rounded-sm py-1.5 text-sm font-semibold ${modo === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            {m === "entrar" ? "Entrar" : "Criar conta"}
          </button>
        ))}
      </div>
      <form onSubmit={(e) => void enviar(e)} className="space-y-3">
        <label className="block space-y-1 text-sm font-medium">
          <span>E-mail</span>
          <Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com.br" />
        </label>
        <label className="block space-y-1 text-sm font-medium">
          <span>Senha</span>
          <Input type="password" required minLength={6} autoComplete={modo === "entrar" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo de 6 caracteres" />
        </label>
        <Button type="submit" className="w-full" disabled={enviando}>
          {modo === "entrar" ? <><LogIn /> Entrar</> : <><UserPlus /> Criar conta</>}
        </Button>
      </form>
      {modo === "cadastrar" ? (
        <p className="text-xs text-muted-foreground">Depois de criar a conta, confirme pelo link enviado ao seu e-mail para conseguir entrar.</p>
      ) : null}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
      </div>
      <Button type="button" variant="outline" className="w-full" onClick={() => void google()}>Continuar com Google</Button>
      {message ? (
        <p className={`rounded-md border px-3 py-2 text-sm ${message.tipo === "ok" ? "border-border bg-secondary/40" : "border-destructive bg-destructive/10 text-destructive"}`} role={message.tipo === "erro" ? "alert" : "status"}>
          {message.texto}
        </p>
      ) : null}
    </div>
  );
}

import { useEffect, useState } from "react";
import { LogIn, LogOut, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

export function AuthPanel({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUserEmail(session?.user.email ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  async function entrar() {
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage(error.message);
  }

  async function cadastrar() {
    setMessage(null);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) setMessage(error.message);
    else if (!data.session) setMessage("Confira seu e-mail para confirmar o cadastro.");
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) setMessage(result.error.message);
  }

  if (userEmail) {
    return (
      <div className={compact ? "flex items-center gap-2" : "space-y-2"}>
        <span className="max-w-48 truncate text-xs font-semibold text-foreground">{userEmail}</span>
        <Button type="button" variant="ghost" size="icon" aria-label="Sair" title="Sair" onClick={() => void supabase.auth.signOut()}>
          <LogOut className="size-4" />
        </Button>
      </div>
    );
  }

  if (compact) return <span className="text-xs text-muted-foreground">Modo consulta</span>;

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" />
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void entrar()}><LogIn /> Entrar</Button>
        <Button type="button" variant="outline" onClick={() => void cadastrar()}><UserPlus /> Criar acesso</Button>
        <Button type="button" variant="secondary" onClick={() => void google()}>Continuar com Google</Button>
      </div>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}
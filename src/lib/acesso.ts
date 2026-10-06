import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Nivel = "admin" | "gerente" | "vendedor";

export const NIVEIS: { id: Nivel; nome: string }[] = [
  { id: "admin", nome: "Administrador" },
  { id: "gerente", nome: "Gerente" },
  { id: "vendedor", nome: "Vendedor" },
];

/** Telas sempre livres (login). */
export const ROTAS_LIVRES = ["/acesso"];

/** Admin sempre enxerga a tela de acessos, para não se trancar fora. */
export function podeVer(nivel: Nivel | null, abas: Set<string>, rota: string) {
  if (ROTAS_LIVRES.includes(rota)) return true;
  if (!nivel) return false;
  if (nivel === "admin" && rota === "/acessos") return true;
  return abas.has(rota);
}

export function useAcesso() {
  const [estado, setEstado] = useState<{
    carregando: boolean;
    logado: boolean;
    nivel: Nivel | null;
    abas: Set<string>;
  }>({ carregando: true, logado: false, nivel: null, abas: new Set() });

  const carregar = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setEstado({ carregando: false, logado: false, nivel: null, abas: new Set() });
      return;
    }
    const { data: nivel } = await supabase.rpc("ensure_my_role");
    const { data: perms } = await supabase
      .from("role_permissions")
      .select("tab")
      .eq("role", (nivel ?? "vendedor") as Nivel);
    setEstado({
      carregando: false,
      logado: true,
      nivel: (nivel as Nivel) ?? null,
      abas: new Set((perms ?? []).map((p) => p.tab)),
    });
  }, []);

  useEffect(() => {
    void carregar();
    const { data } = supabase.auth.onAuthStateChange((e) => {
      if (e === "SIGNED_IN" || e === "SIGNED_OUT" || e === "USER_UPDATED") void carregar();
    });
    const recarregar = () => void carregar();
    window.addEventListener("acessos-alterados", recarregar);
    return () => {
      data.subscription.unsubscribe();
      window.removeEventListener("acessos-alterados", recarregar);
    };
  }, [carregar]);

  return estado;
}

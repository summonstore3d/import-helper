import { Link, useRouterState } from "@tanstack/react-router";
import { Lock, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrototype } from "@/state/prototype";

/** Faixa exibida nas telas editáveis quando o usuário ainda não entrou. */
export function EditLockBanner() {
  const { autenticado, sincronizando } = usePrototype();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (autenticado || sincronizando) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-warn bg-demo px-4 py-3 text-sm text-demo-foreground">
      <p className="flex items-center gap-2">
        <Lock className="size-4 shrink-0" />
        <span>
          <strong>Modo consulta.</strong> Entre na sua conta para editar estes dados.
        </span>
      </p>
      <Button asChild size="sm">
        <Link to="/acesso" search={{ redirect: pathname }}>
          <LogIn /> Entrar para editar
        </Link>
      </Button>
    </div>
  );
}

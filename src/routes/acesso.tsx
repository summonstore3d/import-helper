import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { AuthPanel } from "@/components/AuthPanel";

const destinoSeguro = (v: unknown) =>
  typeof v === "string" && v.startsWith("/") && !v.startsWith("//") && v !== "/acesso" ? v : undefined;

export const Route = createFileRoute("/acesso")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string | undefined } => ({
    redirect: destinoSeguro(search["redirect"]),
  }),
  head: () => ({ meta: [
    { title: "Acesso — Sistema de Precificação D'AGOSTINI" },
    { name: "description", content: "Acesso seguro ao sistema compartilhado de precificação industrial." },
    { property: "og:title", content: "Acesso — Sistema de Precificação D'AGOSTINI" },
    { property: "og:description", content: "Entre para editar custos, estruturas, despesas e preços." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Acesso,
});

function Acesso() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const aoEntrar = useCallback(() => {
    if (redirect) void navigate({ to: redirect });
  }, [navigate, redirect]);
  return (
    <div className="mx-auto max-w-md py-12">
      <p className="text-xs font-bold tracking-widest text-green uppercase">D&apos;AGOSTINI</p>
      <h1 className="mt-2 text-3xl font-black tracking-normal text-foreground">Acesso ao sistema</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Entre para editar a base compartilhada. Sem conta, as páginas ficam disponíveis apenas para consulta.
      </p>
      <div className="mt-6 rounded-md border border-border bg-card p-6 shadow-panel">
        <AuthPanel onSignedIn={aoEntrar} />
      </div>
    </div>
  );
}

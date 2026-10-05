import { createFileRoute } from "@tanstack/react-router";
import { AuthPanel } from "@/components/AuthPanel";

export const Route = createFileRoute("/acesso")({
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
  return (
    <div className="mx-auto max-w-lg py-12">
      <p className="text-xs font-bold tracking-widest text-green uppercase">D&apos;AGOSTINI</p>
      <h1 className="mt-2 text-3xl font-black tracking-normal text-foreground">Acesso ao sistema</h1>
      <p className="mt-2 text-sm text-muted-foreground">Entre para editar a base compartilhada. Sem acesso, as páginas permanecem disponíveis para consulta.</p>
      <div className="mt-6 border-y border-border py-6"><AuthPanel /></div>
    </div>
  );
}
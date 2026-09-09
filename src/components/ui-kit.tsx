import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function PageHeader({
  titulo,
  aba,
  descricao,
  acoes,
}: {
  titulo: string;
  aba?: string;
  descricao?: string;
  acoes?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground uppercase">{titulo}</h1>
          {aba ? (
            <span className="rounded-sm border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              Aba original: {aba}
            </span>
          ) : null}
        </div>
        {descricao ? (
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{descricao}</p>
        ) : null}
      </div>
      {acoes ? <div className="flex flex-wrap items-center gap-2">{acoes}</div> : null}
    </header>
  );
}

export function Panel({
  titulo,
  subtitulo,
  acoes,
  children,
  className,
  bodyClassName,
}: {
  titulo?: string;
  subtitulo?: string;
  acoes?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-md border border-border bg-card shadow-panel",
        className,
      )}
    >
      {titulo ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-secondary/60 px-4 py-2.5">
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">
              {titulo}
            </h2>
            {subtitulo ? (
              <p className="text-xs text-muted-foreground">{subtitulo}</p>
            ) : null}
          </div>
          {acoes ? <div className="flex items-center gap-2">{acoes}</div> : null}
        </div>
      ) : null}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function DemoTag({ children = "DEMONSTRATIVO", className }: { children?: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm bg-demo px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-demo-foreground uppercase",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function RealTag({ children = "DADO DA PLANILHA" }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-sm bg-green-soft px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-accent-foreground uppercase">
      {children}
    </span>
  );
}

export function KPI({
  rotulo,
  valor,
  detalhe,
  destaque,
}: {
  rotulo: string;
  valor: ReactNode;
  detalhe?: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-border bg-card p-4 shadow-panel",
        destaque && "border-l-4 border-l-green",
      )}
    >
      <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        {rotulo}
      </p>
      <p className="mt-1 text-2xl font-bold text-foreground">{valor}</p>
      {detalhe ? <p className="mt-1 text-xs text-muted-foreground">{detalhe}</p> : null}
    </div>
  );
}

export function TableWrap({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <div className="min-w-full">{children}</div>
    </div>
  );
}

export function Th({
  children,
  className,
  align = "left",
}: {
  children?: ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  return (
    <th
      className={cn(
        "sticky top-0 z-10 whitespace-nowrap bg-table-head px-3 py-2 text-[11px] font-semibold tracking-wider text-table-head-foreground uppercase",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  align = "left",
}: {
  children?: ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  return (
    <td
      className={cn(
        "border-b border-border px-3 py-1.5 text-sm text-foreground",
        align === "right" && "text-right tabular-nums",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function SeverityTag({ nivel }: { nivel: "CRÍTICO" | "ALTO" | "MÉDIO" | "BAIXO" }) {
  const estilo: Record<string, string> = {
    "CRÍTICO": "bg-destructive text-destructive-foreground",
    ALTO: "bg-warn text-warn-foreground",
    "MÉDIO": "bg-demo text-demo-foreground",
    BAIXO: "bg-secondary text-secondary-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex min-w-[72px] justify-center rounded-sm px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase",
        estilo[nivel],
      )}
    >
      {nivel}
    </span>
  );
}

export function FlowStep({ children, nota }: { children: ReactNode; nota?: string }) {
  return (
    <div className="rounded-md border border-border bg-secondary/50 px-3 py-2 text-center">
      <p className="text-xs font-semibold tracking-wide text-foreground uppercase">{children}</p>
      {nota ? <p className="text-[11px] text-muted-foreground">{nota}</p> : null}
    </div>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-border bg-muted/50 p-4 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  Boxes,
  Network,
  Factory,
  Truck,
  Receipt,
  Users,
  Landmark,
  Calculator,
  History,
  ShieldCheck,
  FileClock,
  Workflow,
  Menu,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/insumos", label: "Insumos", icon: Boxes },
  { to: "/bom", label: "Estruturas / BOM", icon: Network },
  { to: "/centro-de-custos", label: "Centro de Custos", icon: Factory },
  { to: "/logistica", label: "Logística", icon: Truck },
  { to: "/despesas", label: "Despesas", icon: Receipt },
  { to: "/salarios", label: "Salários", icon: Users },
  { to: "/impostos", label: "Impostos", icon: Landmark },
  { to: "/precificacao", label: "Precificação", icon: Calculator },
  { to: "/historico", label: "Histórico", icon: History },
  { to: "/validacoes", label: "Validações", icon: ShieldCheck },
  { to: "/auditoria", label: "Auditoria", icon: FileClock },
  { to: "/arquitetura", label: "Arquitetura", icon: Workflow },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 shrink-0 flex-col bg-navy text-navy-foreground transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          aberto ? "flex translate-x-0" : "hidden lg:flex -translate-x-full",
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-navy-foreground/15 bg-navy-deep px-4 py-4">
          <div>
            <p className="text-lg leading-none font-black tracking-tight">D&apos;AGOSTINI</p>
            <p className="mt-1 text-[10px] tracking-widest text-navy-muted uppercase">
              Indústria de Concreto
            </p>
          </div>
          <button
            type="button"
            aria-label="Fechar menu"
            className="text-navy-muted lg:hidden"
            onClick={() => setAberto(false)}
          >
            <X className="size-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <p className="px-3 pb-2 text-[10px] font-semibold tracking-widest text-navy-muted uppercase">
            Menu
          </p>
          <ul className="space-y-0.5">
            {nav.map((item) => {
              const ativo = pathname === item.to;
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={() => setAberto(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm font-medium transition-colors",
                      ativo
                        ? "border-l-2 border-green bg-navy-deep text-navy-foreground"
                        : "border-l-2 border-transparent text-navy-muted hover:bg-navy-deep/70 hover:text-navy-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-t border-navy-foreground/15 px-4 py-3 text-[11px] text-navy-muted">
          Base: Ferramenta de Precificação
          <br />
          atualizada em 28.08.2026
        </div>
      </aside>

      {aberto ? (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-30 bg-navy-deep/60 lg:hidden"
          onClick={() => setAberto(false)}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 shadow-panel lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Abrir menu"
              className="text-foreground lg:hidden"
              onClick={() => setAberto(true)}
            >
              <Menu className="size-5" />
            </button>
            <div>
              <h2 className="text-base leading-tight font-bold tracking-tight text-foreground uppercase">
                Ferramenta de Precificação
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Sistema interno de gestão de custos e formação de preço
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-sm bg-warn px-2.5 py-1 text-[11px] font-bold tracking-widest text-warn-foreground uppercase">
              Protótipo / Demonstração
            </span>
            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold text-foreground">diretoria.demo</p>
              <p className="text-[11px] text-muted-foreground">Sessão de apresentação</p>
            </div>
          </div>
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-6">{children}</main>
        <footer className="border-t border-border px-4 py-3 text-[11px] text-muted-foreground lg:px-6">
          Protótipo navegável construído a partir dos dados reais da planilha
          &quot;Ferramenta de Precificação Atualizada 28.08.2026&quot;. Não é o sistema definitivo:
          sem banco de produção, sem integração com ERP e sem cálculo fiscal oficial.
        </footer>
      </div>
    </div>
  );
}

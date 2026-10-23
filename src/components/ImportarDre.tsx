import { useMemo, useState } from "react";
import { FileSpreadsheet, X } from "lucide-react";
import type { Despesas } from "@/data";
import { money, pct } from "@/lib/format";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { aplicarMesDre, analisarMeses, ultimoNaoCadastrado, type Analise, type MesDre } from "@/lib/importar-dre";

const ROTULO: Record<Analise["situacao"], string> = {
  novo: "Novo mês",
  vazio: "Mês sem dados no sistema",
  substitui: "Substitui o mesmo mês do ano anterior",
  cadastrado: "Já cadastrado — reimportar",
};

export function ImportarDre({
  arquivo,
  meses,
  anoInicial,
  base,
  onConfirmar,
  onCancelar,
}: {
  arquivo: string;
  meses: MesDre[];
  anoInicial: number;
  base: Despesas;
  onConfirmar: (novo: Despesas, resumo: string) => void;
  onCancelar: () => void;
}) {
  const [ano, setAno] = useState(String(anoInicial));
  const anoNum = /^\d{4}$/.test(ano) ? Number(ano) : null;
  const analises = useMemo(() => (anoNum ? analisarMeses(base, meses, anoNum) : []), [base, meses, anoNum]);
  const ultimo = useMemo(() => ultimoNaoCadastrado(analises), [analises]);
  const [marcados, setMarcados] = useState<Set<string> | null>(null);
  const selecionados = marcados ?? new Set(ultimo ? [ultimo.dre.mes] : []);

  type Divergencia = { mes: string; conta: string; antes: number | null; depois: number | null };
  const [pendente, setPendente] = useState<{ novo: Despesas; resumo: string; divergencias: Divergencia[] } | null>(null);

  function preparar() {
    let atual = base;
    const feitos: string[] = [];
    const faltando = new Set<string>();
    const divergencias: Divergencia[] = [];
    for (const m of meses) {
      if (!selecionados.has(m.mes) || !anoNum) continue;
      const a = analisarMeses(atual, [m], anoNum)[0];
      if (!a) continue;
      const r = aplicarMesDre(atual, a);
      if (a.situacao === "cadastrado" && a.coluna !== null) {
        const c = a.coluna;
        const rot = `${m.mes}/${anoNum}`;
        const nc = r.despesas.meses.indexOf(rot);
        const dif = (x: number | null | undefined, y: number | null | undefined) => Math.abs((x ?? 0) - (y ?? 0)) > 0.005;
        atual.linhas.forEach((l, i) => {
          const antes = l.valores[c]?.valor ?? null;
          const depois = r.despesas.linhas[i]?.valores[nc]?.valor ?? null;
          if (dif(antes, depois)) divergencias.push({ mes: rot, conta: l.nome, antes, depois });
        });
        atual.rodape.forEach((x, i) => {
          if (x.nome.includes("%")) return;
          const antes = x.valores[c] ?? null;
          const depois = r.despesas.rodape[i]?.valores[nc] ?? null;
          if (dif(antes, depois)) divergencias.push({ mes: rot, conta: x.nome.replace(/:$/, ""), antes, depois });
        });
      }
      atual = r.despesas;
      r.naoEncontradas.forEach((n) => faltando.add(n));
      feitos.push(`${m.mes}/${anoNum}${a.substituido ? ` (no lugar de ${a.substituido})` : ""}`);
    }
    if (!feitos.length) return;
    const resumo = `DRE "${arquivo}" importado: ${feitos.join(", ")}.${faltando.size ? ` Contas não encontradas no DRE (ficaram vazias): ${[...faltando].join(", ")}.` : ""}`;
    if (divergencias.length) setPendente({ novo: atual, resumo, divergencias });
    else onConfirmar(atual, resumo);
  }

  return (
    <div className="mt-4 rounded-md border border-border bg-card shadow-panel">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="size-4 text-primary" />
          <div>
            <p className="text-sm font-semibold">Confirmar importação do DRE mensal</p>
            <p className="text-xs text-muted-foreground">{arquivo} · {meses.length} abas "Geral" lidas</p>
          </div>
        </div>
        <button type="button" onClick={onCancelar} aria-label="Cancelar" className="text-muted-foreground"><X className="size-4" /></button>
      </div>
      <div className="space-y-3 px-4 py-3">
        <label className="flex items-center gap-2 text-xs font-semibold">
          Ano do arquivo
          <input value={ano} onChange={(e) => { setAno(e.target.value.replace(/\D/g, "").slice(0, 4)); setMarcados(null); }} className="h-8 w-20 rounded-sm border border-input bg-background px-2 text-sm" />
        </label>
        <p className="text-xs text-muted-foreground">
          {ultimo ? <>Último mês ainda não cadastrado: <strong>{ultimo.dre.mes}/{ano}</strong> — já vem marcado. Marque outros meses se quiser trazê-los também; meses já cadastrados podem ser reimportados e as divergências serão mostradas antes de gravar.</> : "Todos os meses do arquivo já estão cadastrados."}
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="py-1" />
              <th className="py-1">Mês</th>
              <th className="py-1">Situação</th>
              <th className="py-1 text-right">Faturamento</th>
              <th className="py-1 text-right">Despesas (VAR+PES+OP)</th>
              <th className="py-1 text-right">% bruta</th>
            </tr>
          </thead>
          <tbody>
            {analises.map((a) => {
              const fat = a.dre.receita === null ? null : a.dre.receita - a.dre.devolucao;
              const desp = (a.dre.grupos.get("007") ?? 0) + (a.dre.grupos.get("009") ?? 0) + (a.dre.grupos.get("010") ?? 0);
              const bloqueado = false;
              return (
                <tr key={a.dre.aba} className="border-t border-border">
                  <td className="py-1.5">
                    <input
                      type="checkbox"
                      disabled={bloqueado}
                      checked={!bloqueado && selecionados.has(a.dre.mes)}
                      onChange={(e) => {
                        const s = new Set(selecionados);
                        if (e.target.checked) s.add(a.dre.mes); else s.delete(a.dre.mes);
                        setMarcados(s);
                      }}
                    />
                  </td>
                  <td className="py-1.5 font-semibold">{a.dre.mes}/{ano}</td>
                  <td className={`py-1.5 text-xs ${a.situacao === "cadastrado" ? "text-muted-foreground" : "font-semibold text-primary"}`}>
                    {ROTULO[a.situacao]}{a.substituido ? ` (${a.substituido})` : ""}
                  </td>
                  <td className="py-1.5 text-right num">{money(fat)}</td>
                  <td className="py-1.5 text-right num">{money(desp)}</td>
                  <td className="py-1.5 text-right num">{fat ? pct(desp / fat) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="text-xs text-muted-foreground">
          Faturamento = Receita de vendas − Devoluções. Contas lidas das seções 005 (CMV), 007 (Variáveis), 009 (Pessoal) e 010 (Operacionais).
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={preparar} disabled={!anoNum || !analises.some((a) => selecionados.has(a.dre.mes))} className="inline-flex h-8 items-center rounded-sm bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-40">
            Confirmar importação
          </button>
          <button type="button" onClick={onCancelar} className="h-8 rounded-sm px-3 text-sm font-semibold text-muted-foreground">Cancelar</button>
        </div>
      </div>
      <AlertDialog open={!!pendente} onOpenChange={(o) => { if (!o) setPendente(null); }}>
        <AlertDialogContent className="max-w-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{pendente?.divergencias.length} divergências com o que já estava cadastrado</AlertDialogTitle>
            <AlertDialogDescription>
              Os valores abaixo serão substituídos pelos do DRE. Nada é gravado até você confirmar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-[55vh] overflow-auto rounded-sm border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-secondary text-left text-xs">
                <tr><th className="px-2 py-1">Mês</th><th className="px-2 py-1">Conta</th><th className="px-2 py-1 text-right">No sistema</th><th className="px-2 py-1 text-right">No DRE</th><th className="px-2 py-1 text-right">Diferença</th></tr>
              </thead>
              <tbody>
                {pendente?.divergencias.map((d, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-2 py-1 font-semibold">{d.mes}</td>
                    <td className="px-2 py-1">{d.conta}</td>
                    <td className="px-2 py-1 text-right num">{money(d.antes ?? 0)}</td>
                    <td className="px-2 py-1 text-right num">{money(d.depois ?? 0)}</td>
                    <td className="px-2 py-1 text-right num">{money((d.depois ?? 0) - (d.antes ?? 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar, manter como está</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (pendente) onConfirmar(pendente.novo, pendente.resumo); setPendente(null); }}>
              Confirmar e substituir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

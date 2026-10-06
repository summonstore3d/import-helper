import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { isNum, money, pct, qtd, REF_INCONSISTENTE } from "@/lib/format";
import { KPI, PageHeader, Panel, RealTag, Td, Th } from "@/components/ui-kit";
import { producaoCorrigida, resumoCentroCustos, TAXA_ARMACAO_PADRAO } from "@/lib/correcoes";
import { taxaDoSetor, taxaHora } from "@/lib/custos-industriais";
import { usePrototype } from "@/state/prototype";
import { EditLockBanner } from "@/components/EditLockBanner";

export const Route = createFileRoute("/centro-de-custos")({
  head: () => ({
    meta: [
      { title: "Centro de Custos — Sistema de Precificação" },
      {
        name: "description",
        content:
          "Setores produtivos, rateio de mão de obra e manutenção, horas disponíveis e custo por hora real de cada centro de custo.",
      },
      { property: "og:title", content: "Centro de Custos — Sistema de Precificação" },
      {
        property: "og:description",
        content: "Custo por hora de cada setor produtivo e roteiro de produção por produto.",
      },
    ],
  }),
  component: CentroDeCustos,
});

function valor(v: number | string | null, tipo: "money" | "pct" | "num") {
  if (!isNum(v)) return <span className="text-xs text-destructive">{REF_INCONSISTENTE}</span>;
  return tipo === "money" ? money(v) : tipo === "pct" ? pct(v, 0) : qtd(v);
}

function CentroDeCustos() {
  const { centroCustos, guiaCdc, baseIndustrial, setoresCalculados, atualizarSetor, atualizarRoteiro, atualizarMaoDeObra, atualizarManutencao, autenticado } = usePrototype();
  const [aba, setAba] = useState<"setores" | "roteiro" | "guia">("setores");
  const quebrados = setoresCalculados.filter((s) => !isNum(s.horaReal)).length;
  const resumo = resumoCentroCustos(baseIndustrial);

  return (
    <>
      <PageHeader
        titulo="Centro de Custos"
        aba="Centro de Custos + Guia - CDC"
        descricao="O rateio industrial que transforma folha de pagamento e manutenção em custo por hora de setor, e este em custo de produção por produto."
      />
      <EditLockBanner />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPI rotulo="Setores produtivos" valor={qtd(centroCustos.setores.length)} />
        <KPI rotulo="Produtos com roteiro" valor={qtd(centroCustos.roteiro.length)} />
        <KPI rotulo="Funções mapeadas" valor={qtd(guiaCdc.maoDeObra.length)} detalhe="Guia - CDC" />
        <KPI
          rotulo="Setores com referência quebrada"
          valor={qtd(quebrados)}
          detalhe="Erro herdado da planilha"
          destaque
        />
      </div>

      <div className="mt-4 rounded-md border border-warn bg-demo px-3 py-2 text-sm text-demo-foreground">
        <strong>Correções aplicadas no custo de produção:</strong> a armação passa a ser contada uma
        única vez (horas × {money(taxaHora(setoresCalculados, "Robô") ?? TAXA_ARMACAO_PADRAO)} por hora) — a planilha multiplicava pelas
        horas duas vezes em {qtd(resumo.duplaMultiplicacao)} produtos. Outros{" "}
        {qtd(resumo.armacaoEstimada)} produtos tinham horas de armação sem custo e agora recebem a
        taxa do setor. {qtd(resumo.referenciaQuebrada)} produto(s) com referência quebrada ficam
        bloqueados para preço, em vez de gerar valor incorreto. Impacto médio no custo de produção:{" "}
        {money(resumo.impactoMedio)} por peça.
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {[
          ["setores", "Custo por setor"],
          ["roteiro", "Roteiro por produto"],
          ["guia", "Rateio de mão de obra"],
        ].map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => setAba(k as typeof aba)}
            className={
              aba === k
                ? "rounded-sm bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground uppercase"
                : "rounded-sm border border-input px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase"
            }
          >
            {l}
          </button>
        ))}
      </div>

      {aba === "setores" ? (
        <Panel
          className="mt-4"
          titulo="Custo por setor"
          subtitulo="Mão de obra, manutenção, eficiência e horas disponíveis"
          acoes={<RealTag />}
          bodyClassName="p-0"
        >
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Setor</Th>
                  <Th>Grupo</Th>
                  <Th align="right">Mão de obra</Th>
                  <Th align="right">Manutenção</Th>
                  <Th align="right">Total mês</Th>
                  <Th align="right">Eficiência</Th>
                  <Th align="right">Transp. interno</Th>
                  <Th align="right">Horas disp.</Th>
                  <Th align="right">$/h ideal</Th>
                  <Th align="right">$/h real</Th>
                </tr>
              </thead>
              <tbody>
                {centroCustos.setores.map((s, i) => { const calc = setoresCalculados[i] ?? s; return (
                  <tr key={`${s.nome}-${i}`} className="odd:bg-secondary/30">
                    <Td className="font-semibold">{s.nome}</Td>
                    <Td className="text-xs">{s.grupo ?? "—"}</Td>
                    <Td align="right">{valor(calc.maoDeObra, "money")}</Td>
                    <Td align="right">{valor(calc.manutencao, "money")}</Td>
                    <Td align="right">{valor(calc.mesTotal, "money")}</Td>
                    <Td align="right"><EditableNumber disabled={!autenticado} value={s.eficienciaPerdida} onChange={(v) => atualizarSetor(i, { ...s, eficienciaPerdida: v })} /></Td>
                    <Td align="right"><EditableNumber disabled={!autenticado} value={s.transporteInterno} onChange={(v) => atualizarSetor(i, { ...s, transporteInterno: v })} /></Td>
                    <Td align="right"><EditableNumber disabled={!autenticado} value={s.horasDisponiveis} onChange={(v) => atualizarSetor(i, { ...s, horasDisponiveis: v })} /></Td>
                    <Td align="right">{valor(calc.horaIdeal, "money")}</Td>
                    <Td align="right" className="font-semibold">
                      {valor(calc.horaReal, "money")}
                    </Td>
                  </tr>
                ); })}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      {aba === "roteiro" ? (
        <Panel
          className="mt-4"
          titulo="Roteiro de produção por produto"
          subtitulo="Setor, tempo, armação, pintura e custo de produção"
          acoes={<RealTag />}
          bodyClassName="p-0"
        >
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Produto</Th>
                  <Th>Setor</Th>
                  <Th align="right">$/h setor</Th>
                  <Th align="right">Horas/produto</Th>
                  <Th align="right">Central</Th>
                  <Th align="right">Armação</Th>
                  <Th align="right">Pintura</Th>
                  <Th align="right">Kg/produto</Th>
                  <Th align="right">Custo na planilha</Th>
                  <Th align="right">Custo corrigido</Th>
                </tr>
              </thead>
              <tbody>
                {centroCustos.roteiro.slice(0, 300).map((r, i) => {
                  const c = producaoCorrigida(r.produto, baseIndustrial);
                  return (
                  <tr key={`${r.produto}-${i}`} className="odd:bg-secondary/30">
                    <Td className="max-w-[20rem] truncate">{r.produto}</Td>
                    <Td className="text-xs">{r.setor ?? "—"}</Td>
                    <Td align="right">{valor(taxaDoSetor(setoresCalculados, r.setor), "money")}</Td>
                     <Td align="right"><EditableNumber disabled={!autenticado} value={r.horaProduto} onChange={(v) => atualizarRoteiro(i, { ...r, horaProduto: v })} /></Td>
                     <Td align="right">{valor(c.componentes?.central ?? null, "money")}</Td>
                     <Td align="right"><EditableNumber disabled={!autenticado} value={r.horaArmacao} onChange={(v) => atualizarRoteiro(i, { ...r, horaArmacao: v })} /></Td>
                     <Td align="right"><label className="inline-flex items-center gap-1"><input type="checkbox" disabled={!autenticado} checked={typeof r.pintura === "number" && r.pintura > 0} onChange={(e) => atualizarRoteiro(i, { ...r, pintura: e.target.checked ? 1 : null })} />{valor(c.componentes?.pintura || null, "money")}</label></Td>
                     <Td align="right"><EditableNumber disabled={!autenticado} value={r.kgPorProduto} onChange={(v) => atualizarRoteiro(i, { ...r, kgPorProduto: v })} /></Td>
                    <Td align="right" className="text-muted-foreground">
                      {valor(r.custoProducao, "money")}
                    </Td>
                    <Td align="right" className="font-semibold">
                      {c.valor === null ? (
                        <span className="text-xs text-destructive">Bloqueado</span>
                      ) : (
                        money(c.valor)
                      )}
                      {c.armacaoEstimada ? (
                        <span className="ml-1 text-warn" title={c.alertas.join(" ")}>
                          *
                        </span>
                      ) : null}
                    </Td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      {aba === "guia" ? (
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <Panel
            titulo="Alocação de mão de obra por função"
            subtitulo="Guia - CDC: quantas pessoas de cada função em cada setor"
            bodyClassName="p-0"
          >
            <div className="max-h-[52vh] overflow-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <Th>Função</Th>
                    {Object.keys(guiaCdc.maoDeObra[0]?.valores ?? {}).map((c) => (
                      <Th key={c} align="right">
                        {c}
                      </Th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const ehTotal = (f: { funcao: string }) => f.funcao.trim().toLowerCase().startsWith("total");
                    const funcoes = guiaCdc.maoDeObra.filter((f) => !ehTotal(f));
                    const colunas = Object.keys(guiaCdc.maoDeObra[0]?.valores ?? {});
                    return (
                      <>
                        {funcoes.map((f) => (
                          <tr key={f.funcao} className="odd:bg-secondary/20">
                            <Td className="max-w-[16rem] truncate font-medium">{f.funcao}</Td>
                            {Object.entries(f.valores).map(([k, v]) => (
                              <Td key={k} align="right" className={isNum(v) && v > 0 ? "font-semibold" : "text-muted-foreground"}>
                                {autenticado ? (
                                  <EditableNumber inteiros value={v} onChange={(n) => atualizarMaoDeObra(guiaCdc.maoDeObra.indexOf(f), k, n ?? 0)} />
                                ) : isNum(v) ? (v === 0 ? "–" : qtd(v)) : "—"}
                              </Td>
                            ))}
                          </tr>
                        ))}
                        <tr className="border-t-2 border-border bg-secondary/40 font-semibold">
                          <Td>Total (soma)</Td>
                          {colunas.map((k) => {
                            const soma = funcoes.reduce((acc, f) => acc + (isNum(f.valores[k]) ? (f.valores[k] as number) : 0), 0);
                            return (
                              <Td key={k} align="right">
                                {soma === 0 ? "–" : qtd(Math.round(soma))}
                              </Td>
                            );
                          })}
                        </tr>
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel titulo="Rateio de manutenção por setor" bodyClassName="p-0">
            <div className="max-h-[52vh] overflow-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <Th>Setor</Th>
                    <Th align="right">Total</Th>
                    <Th align="right">% do total</Th>
                    <Th align="right">Manutenção do setor</Th>
                  </tr>
                </thead>
                <tbody>
                  {guiaCdc.manutencao.map((m, i) => (
                    <tr key={`${m.setor}-${i}`} className="odd:bg-secondary/30">
                      <Td className="font-medium">{m.setor}</Td>
                       <Td align="right"><EditableNumber disabled={!autenticado} value={m.total} onChange={(v) => atualizarManutencao(i, "total", v)} /></Td>
                       <Td align="right"><EditableNumber disabled={!autenticado} value={m.percentual} onChange={(v) => atualizarManutencao(i, "percentual", v)} /></Td>
                      <Td align="right" className="font-semibold">
                        {money(typeof m.total === "number" && typeof m.percentual === "number" ? m.total * m.percentual : m.manutencaoSetor)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      ) : null}
    </>
  );
}

function EditableNumber({ value, onChange, disabled = false, inteiros = false }: { value: number | string | null; onChange: (value: number | null) => void; disabled?: boolean; inteiros?: boolean }) {
  if (disabled) return <>{isNum(value) ? qtd(value) : "—"}</>;
  const arredondar = (n: number | null) => (n === null ? null : inteiros ? Math.round(n) : n);
  return <input type="number" step={inteiros ? "1" : "0.01"} value={isNum(value) ? (inteiros ? Math.round(value) : value) : ""} onChange={(e) => onChange(arredondar(e.target.value === "" ? null : Number(e.target.value)))} className="h-7 w-24 rounded-sm border border-transparent bg-transparent px-1 text-right tabular-nums hover:border-input focus:border-ring focus:bg-background focus:outline-none" />;
}

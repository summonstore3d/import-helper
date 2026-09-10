import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, Save } from "lucide-react";
import { parametros, produtos } from "@/data";
import { money, moneyPreciso, pct, qtd } from "@/lib/format";
import { calcularPreco, cenarioSugerido, parametrosPadrao, type Cenario } from "@/lib/pricing";
import { usePrototype } from "@/state/prototype";
import { exportarPrecificacaoExcel, type LinhaMemoriaExport } from "@/lib/planilha-precificacao";
import { despesasVigentes, frota as frotaParams, simplesVigente } from "@/lib/correcoes";
import { DemoTag, EmptyNote, KPI, PageHeader, Panel, RealTag, Td, Th } from "@/components/ui-kit";

type Search = { produto?: string | undefined };

export const Route = createFileRoute("/precificacao")({
  validateSearch: (search: Record<string, unknown>): Search =>
    typeof search["produto"] === "string" ? { produto: search["produto"] } : {},
  head: () => ({
    meta: [
      { title: "Precificação — Simulador com Memória de Cálculo" },
      {
        name: "description",
        content:
          "Simulador de preço de venda com memória de cálculo completa: matéria-prima, produção, despesas, impostos por cenário, comissão, inadimplência e frete.",
      },
      { property: "og:title", content: "Precificação — Simulador com Memória de Cálculo" },
      {
        property: "og:description",
        content: "Formação de preço passo a passo, auditável, com os parâmetros reais da empresa.",
      },
    ],
  }),
  component: Precificacao,
});

const CENARIOS: Cenario[] = [
  "Venda Normal",
  "Venda com Base Reduzida",
  "Venda com Material Via Tonial",
];

function Precificacao() {
  const { produto } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const {
    itensBom,
    registrarVersao,
    registrarAuditoria,
    metodoDespesas,
    definirMetodoDespesas,
    despesasPercentual,
    comparativoDespesas,
  } = usePrototype();
  const padrao = parametrosPadrao();

  const selecionado =
    produto && produtos.some((p) => p.full === produto) ? produto : parametros.produtoExemplo;

  const [cenario, setCenario] = useState<Cenario>(cenarioSugerido(selecionado));
  const [margem, setMargem] = useState(padrao.margem * 100);
  const [comissao, setComissao] = useState(padrao.comissao * 100);
  const [inadimplencia, setInadimplencia] = useState(padrao.inadimplencia * 100);
  const [despesasPct, setDespesasPct] = useState((despesasPercentual ?? padrao.despesas) * 100);

  // Trocar o método de apuração das despesas repõe o percentual vigente no simulador.
  useEffect(() => {
    if (despesasPercentual !== null) setDespesasPct(despesasPercentual * 100);
  }, [despesasPercentual]);

  const [frota, setFrota] = useState(false);
  const [km, setKm] = useState(padrao.km);
  const [pecas, setPecas] = useState(padrao.pecasPorEntrega);
  const [salvo, setSalvo] = useState<string | null>(null);

  const itens = itensBom(selecionado);
  const r = calcularPreco({
    produto: selecionado,
    cenario,
    itensMP: itens,
    margem: margem / 100,
    comissao: comissao / 100,
    inadimplencia: inadimplencia / 100,
    despesas: despesasPct / 100,
    frota,
    km,
    pecasPorEntrega: pecas,
  });

  const preco = r.preco;
  const linhasMemoria: { rotulo: string; base: string; valor: string; tipo?: "total" | "grupo" }[] = [
    {
      rotulo: "1. Matéria-prima (BOM)",
      base: `${qtd(itens.length)} componentes`,
      valor: money(r.custoMP),
    },
    {
      rotulo: "2. Custo de produção",
      base:
        r.producao.componentes === null
          ? "Centro de Custos — indisponível"
          : `Setor ${money(r.producao.componentes.setor)} + central ${money(
              r.producao.componentes.central,
            )} + armação ${money(r.producao.componentes.armacao)} + pintura ${money(
              r.producao.componentes.pintura,
            )}`,
      valor: r.custoProducao === null ? "Bloqueado" : money(r.custoProducao),
    },
    {
      rotulo: "2a. Armação (correção)",
      base:
        r.producao.horasArmacao > 0
          ? `${qtd(r.producao.horasArmacao)} h × ${money(r.producao.taxaArmacao)}/h — contada uma única vez`
          : "Produto sem etapa de armação",
      valor: money(r.producao.componentes?.armacao ?? 0),
    },
    {
      rotulo: "Custo absoluto",
      base: "1 + 2",
      valor: money(r.custoAbsoluto),
      tipo: "grupo",
    },
    {
      rotulo: "3. Despesas operacionais",
      base: `Taxa ponderada: soma das despesas ÷ soma das receitas de ${despesasVigentes.meses} meses`,
      valor: pct(r.despesas, 4),
    },
    {
      rotulo: "4. Impostos do cenário",
      base: r.regra.detalhe
        ? `ICMS ${pct(r.regra.detalhe.icms, 0)} · PIS ${pct(r.regra.detalhe.pis, 2)} · COFINS ${pct(
            r.regra.detalhe.cofins,
            1,
          )} · IRPJ ${pct(r.regra.detalhe.irpj, 2)} · CSLL ${pct(r.regra.detalhe.csll, 1)}`
        : `Simples: alíquota efetiva = (RBT12 × ${pct(simplesVigente.aliquotaNominal, 2)} − ${money(
            simplesVigente.valorDeduzir,
          )}) ÷ RBT12`,
      valor: pct(r.impostos, 2),
    },
    { rotulo: "5. Comissão", base: "Parâmetro comercial", valor: pct(r.comissao, 2) },
    { rotulo: "6. Inadimplência", base: "Parâmetro comercial", valor: pct(r.inadimplencia, 2) },
    { rotulo: "7. Margem de lucro", base: "Parâmetro comercial", valor: pct(r.margem, 2) },
    {
      rotulo: "Soma dos percentuais",
      base: "3 + 4 + 5 + 6 + 7",
      valor: pct(r.somaPercentuais, 2),
      tipo: "grupo",
    },
    {
      rotulo: "Preço bruto (markup divisor)",
      base: "Custo absoluto ÷ (1 − soma dos percentuais)",
      valor: r.precoBruto === null ? "Bloqueado" : money(r.precoBruto),
      tipo: "grupo",
    },
    {
      rotulo: "8. Frete (frota própria)",
      base: frota
        ? `${qtd(km)} km ÷ ${qtd(pecas)} peças × ${money(frotaParams.custoTotalPorKm)}/km × ${qtd(
            parametros.fatorFrete,
          )} (ida e volta)`
        : "Entrega não incluída (retirada no pátio)",
      valor: money(r.logistica),
    },
    {
      rotulo: "Preço de venda sugerido",
      base: "Preço bruto + frete, arredondado em 2 casas",
      valor: money(preco),
      tipo: "total",
    },
  ];

  /** Mesma memória de cálculo da tela, com valores numéricos para o Excel. */
  const linhasExcel: LinhaMemoriaExport[] = [
    { rotulo: "1. Matéria-prima (BOM)", base: `${qtd(itens.length)} componentes`, valor: r.custoMP, formato: "moeda" },
    {
      rotulo: "2. Custo de produção",
      base: linhasMemoria[1]?.base ?? "",
      valor: r.custoProducao,
      formato: "moeda",
    },
    {
      rotulo: "2a. Armação (correção)",
      base: linhasMemoria[2]?.base ?? "",
      valor: r.producao.componentes?.armacao ?? 0,
      formato: "moeda",
    },
    { rotulo: "Custo absoluto", base: "1 + 2", valor: r.custoAbsoluto, formato: "moeda", tipo: "grupo" },
    {
      rotulo: "3. Despesas operacionais",
      base: linhasMemoria[4]?.base ?? "",
      valor: r.despesas,
      formato: "percentual",
    },
    {
      rotulo: "4. Impostos do cenário",
      base: linhasMemoria[5]?.base ?? "",
      valor: r.impostos,
      formato: "percentual",
    },
    { rotulo: "5. Comissão", base: "Parâmetro comercial", valor: r.comissao, formato: "percentual" },
    {
      rotulo: "6. Inadimplência",
      base: "Parâmetro comercial",
      valor: r.inadimplencia,
      formato: "percentual",
    },
    { rotulo: "7. Margem de lucro", base: "Parâmetro comercial", valor: r.margem, formato: "percentual" },
    {
      rotulo: "Soma dos percentuais",
      base: "3 + 4 + 5 + 6 + 7",
      valor: r.somaPercentuais,
      formato: "percentual",
      tipo: "grupo",
    },
    {
      rotulo: "Preço bruto (markup divisor)",
      base: "Custo absoluto ÷ (1 − soma dos percentuais)",
      valor: r.precoBruto,
      formato: "moeda",
      tipo: "grupo",
    },
    {
      rotulo: "8. Frete (frota própria)",
      base: linhasMemoria[11]?.base ?? "",
      valor: r.logistica,
      formato: "moeda",
    },
    {
      rotulo: "Preço de venda sugerido",
      base: "Preço bruto + frete",
      valor: preco,
      formato: "moeda",
      tipo: "total",
    },
  ];

  function exportarExcel() {
    exportarPrecificacaoExcel({
      produto: selecionado,
      cenario,
      linhas: linhasExcel,
      itens: itens.map((i) => ({
        item: i.item,
        quantidade: i.quantidade,
        unidade: i.unidade,
        custoUnitario: i.custoUnitario,
        custoTotal: i.custoTotal,
      })),
      nomeArquivo: `precificacao-${selecionado.split(" ")[0] ?? "produto"}.xlsx`,
    });
  }

  function salvar() {
    if (preco === null) return;
    registrarVersao({
      produto: selecionado,
      custo: r.custoAbsoluto,
      margem: r.margem,
      preco,
      cenario,
      status: "Simulação",
    });
    registrarAuditoria({
      usuario: "diretoria.demo",
      modulo: "Precificação",
      registro: selecionado,
      campo: `Preço simulado — ${cenario}`,
      valorAnterior: "—",
      valorNovo: money(preco),
      motivo: "Simulação salva durante a demonstração",
      origem: "Sessão de demonstração",
    });
    setSalvo(`Simulação registrada no histórico às ${new Date().toLocaleTimeString("pt-BR")}`);
  }

  return (
    <>
      <PageHeader
        titulo="Precificação"
        aba="Precificação"
        descricao="O coração da ferramenta. No sistema, o preço é calculado por um motor de regras auditável, com memória de cálculo linha a linha e cenário tributário explícito."
        acoes={
          <>
            <select
              value={selecionado}
              onChange={(e) => {
                navigate({ search: { produto: e.target.value } });
                setCenario(cenarioSugerido(e.target.value));
                setSalvo(null);
              }}
              className="h-9 max-w-[24rem] rounded-sm border border-input bg-background px-2 text-sm outline-none focus:border-ring"
            >
              {produtos.map((p) => (
                <option key={p.full} value={p.full}>
                  {p.full}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={exportarExcel}
              className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-2 text-sm font-semibold"
            >
              <Download className="size-4" /> Exportar Excel
            </button>
            <button
              type="button"
              onClick={salvar}
              disabled={preco === null}
              className="inline-flex items-center gap-1.5 rounded-sm bg-green px-3 py-2 text-sm font-semibold text-green-foreground disabled:opacity-40"
            >
              <Save className="size-4" /> Salvar simulação
            </button>
          </>
        }
      />

      {salvo ? (
        <p className="mb-4 rounded-md border border-green bg-green-soft px-3 py-2 text-sm font-medium text-accent-foreground">
          {salvo} — veja em{" "}
          <Link to="/historico" className="underline">
            Histórico de Preços
          </Link>
          .
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[20rem_1fr]">
        <div className="space-y-4">
          <Panel titulo="Cenário de venda" subtitulo="Regras tributárias reais da planilha">
            <div className="space-y-2">
              {CENARIOS.map((c) => (
                <label
                  key={c}
                  className="flex cursor-pointer items-center gap-2 rounded-sm border border-border bg-secondary/40 px-3 py-2 text-sm"
                >
                  <input
                    type="radio"
                    name="cenario"
                    checked={cenario === c}
                    onChange={() => {
                      setCenario(c);
                      setSalvo(null);
                    }}
                  />
                  <span className="font-medium">{c}</span>
                </label>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Família do produto: <strong className="text-foreground">{r.regra.categoria}</strong>
            </p>
            {r.impostosDemonstrativos ? (
              <p className="mt-2 rounded-sm border border-warn bg-demo px-2 py-1.5 text-xs text-demo-foreground">
                <DemoTag>Regra a validar</DemoTag> {r.observacaoImpostos}
              </p>
            ) : (
              <p className="mt-2">
                <RealTag>Alíquota da planilha</RealTag>
              </p>
            )}
          </Panel>

          <Panel titulo="Parâmetros" subtitulo="Ajuste e veja o preço recalcular">
            <div className="space-y-3">
              {[
                { l: "Margem de lucro (%)", v: margem, set: setMargem },
                { l: "Despesas operacionais (%)", v: despesasPct, set: setDespesasPct },
                { l: "Comissão (%)", v: comissao, set: setComissao },
                { l: "Inadimplência (%)", v: inadimplencia, set: setInadimplencia },
              ].map((f) => (
                <label key={f.l} className="block text-sm">
                  <span className="font-semibold">{f.l}</span>
                  <input
                    type="number"
                    step="0.01"
                    value={Number(f.v.toFixed(4))}
                    onChange={(e) => {
                      f.set(Number(e.target.value));
                      setSalvo(null);
                    }}
                    className="mt-1 h-9 w-full rounded-sm border border-input bg-background px-2 text-sm tabular-nums outline-none focus:border-ring"
                  />
                </label>
              ))}
              <label className="flex items-center gap-2 rounded-sm border border-border bg-secondary/40 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={frota}
                  onChange={(e) => {
                    setFrota(e.target.checked);
                    setSalvo(null);
                  }}
                />
                <span className="font-medium">Entrega com frota própria</span>
              </label>
              {frota ? (
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm">
                    <span className="font-semibold">Distância (km)</span>
                    <input
                      type="number"
                      value={km}
                      onChange={(e) => setKm(Number(e.target.value))}
                      className="mt-1 h-9 w-full rounded-sm border border-input bg-background px-2 text-sm outline-none focus:border-ring"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-semibold">Peças/entrega</span>
                    <input
                      type="number"
                      value={pecas}
                      onChange={(e) => setPecas(Number(e.target.value))}
                      className="mt-1 h-9 w-full rounded-sm border border-input bg-background px-2 text-sm outline-none focus:border-ring"
                    />
                  </label>
                </div>
              ) : null}
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <KPI rotulo="Custo absoluto" valor={money(r.custoAbsoluto)} detalhe="MP + produção" />
            <KPI
              rotulo="Carga sobre o preço"
              valor={pct(r.somaPercentuais, 2)}
              detalhe="Despesas + impostos + comissão + inadimplência + margem"
            />
            <KPI
              rotulo="Preço de venda sugerido"
              valor={preco === null ? "Indisponível" : money(preco)}
              detalhe={cenario}
              destaque
            />
          </div>

          {r.bloqueios.length ? (
            <EmptyNote>
              <strong>O preço está bloqueado até estes pontos serem resolvidos:</strong>
              <ul className="mt-1.5 list-disc space-y-1 pl-4">
                {r.bloqueios.slice(0, 6).map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </EmptyNote>
          ) : null}

          {r.alertas.length ? (
            <div className="rounded-md border border-warn bg-demo px-3 py-2 text-sm text-demo-foreground">
              <strong>Avisos do cálculo:</strong>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {Array.from(new Set(r.alertas))
                  .slice(0, 5)
                  .map((a) => (
                    <li key={a}>{a}</li>
                  ))}
              </ul>
            </div>
          ) : null}

          {r.reconciliacao ? (
            <p
              className={
                r.reconciliacao.ok
                  ? "rounded-md border border-green bg-green-soft px-3 py-2 text-sm font-medium text-accent-foreground"
                  : "rounded-md border border-destructive px-3 py-2 text-sm font-medium text-destructive"
              }
            >
              Validação de integridade: preço − (custos absolutos + preço × soma dos percentuais) ={" "}
              {moneyPreciso(r.reconciliacao.diferenca)}{" "}
              {r.reconciliacao.ok ? "— cálculo consistente com a DRE." : "— divergência detectada."}
            </p>
          ) : null}

          <Panel
            titulo="Memória de cálculo"
            subtitulo="Cada passo rastreável até a origem do dado"
            bodyClassName="p-0"
          >
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Etapa</Th>
                  <Th>Base de cálculo</Th>
                  <Th align="right">Valor</Th>
                </tr>
              </thead>
              <tbody>
                {linhasMemoria.map((l) => (
                  <tr
                    key={l.rotulo}
                    className={
                      l.tipo === "total"
                        ? "bg-table-total font-bold"
                        : l.tipo === "grupo"
                          ? "bg-table-group font-semibold"
                          : "odd:bg-secondary/30"
                    }
                  >
                    <Td>{l.rotulo}</Td>
                    <Td className="text-xs text-muted-foreground">{l.base}</Td>
                    <Td align="right">{l.valor}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <Panel
            titulo="Composição da matéria-prima"
            subtitulo={`${selecionado} — ${qtd(itens.length)} componentes`}
            acoes={
              <Link
                to="/bom"
                search={{ produto: selecionado }}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Editar estrutura
              </Link>
            }
            bodyClassName="p-0"
          >
            <div className="max-h-[36vh] overflow-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <Th>Componente</Th>
                    <Th align="right">Qtd.</Th>
                    <Th>Un.</Th>
                    <Th align="right">Custo unit.</Th>
                    <Th align="right">Total</Th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((l, i) => (
                    <tr key={`${l.item}-${i}`} className="odd:bg-secondary/30">
                      <Td className="max-w-[22rem] truncate">
                        {l.item} {l.demonstrativo ? <DemoTag>Sessão</DemoTag> : null}
                      </Td>
                      <Td align="right">{qtd(l.quantidade)}</Td>
                      <Td>{l.unidade ?? "—"}</Td>
                      <Td align="right">{moneyPreciso(l.custoUnitario)}</Td>
                      <Td align="right" className="font-semibold">
                        {money(l.custoTotal)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

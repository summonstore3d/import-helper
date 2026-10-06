import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ChevronRight } from "lucide-react";
import {
  bom,
  impostos,
  logistica,
  parametros,
  produtos,
  salarios,
  categoriaDoProduto,
} from "@/data";
import { checks } from "@/lib/checks";
import { money, pct, qtd } from "@/lib/format";
import { cenarioSugerido, precoRapido } from "@/lib/pricing";
import { usePrototype } from "@/state/prototype";
import { DemoTag, KPI, Panel, PageHeader, RealTag, SeverityTag, Td, Th } from "@/components/ui-kit";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel de Precificação — D'AGOSTINI" },
      {
        name: "description",
        content:
          "Painel executivo de precificação: produtos, insumos, estruturas de custo e formação de preço em um sistema compartilhado.",
      },
      { property: "og:title", content: "Painel de Precificação — D'AGOSTINI" },
      {
        property: "og:description",
        content:
          "Como a planilha de precificação evolui para um sistema web profissional, usando os dados reais da empresa.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { itensBom, baseIndustrial, despesasPercentual, comparativoDespesas, listaInsumos, centroCustos: ccVigente } = usePrototype();
  const mesesDespesas = comparativoDespesas.meses;
  const problemas = checks();
  const criticos = problemas.filter((p) => p.severidade === "CRÍTICO");
  const categorias = new Map<string, number>();
  produtos.forEach((p) => {
    const c = categoriaDoProduto(p.full);
    categorias.set(c, (categorias.get(c) ?? 0) + 1);
  });
  const topCategorias = Array.from(categorias.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maiorCategoria = topCategorias[0]?.[1] ?? 1;

  const produtosProntos = produtos
    .slice(0, 200)
    .filter((p) => precoRapido(p.full, "Venda Normal", { itensMP: itensBom(p.full), base: baseIndustrial, despesas: despesasPercentual }) !== null)
    .length;

  return (
    <>
      <PageHeader
        titulo="Painel de Precificação"
        aba="Menu"
        descricao="Visão executiva do sistema. A base oficial vem da planilha ajustada e as alterações autorizadas ficam compartilhadas e auditadas."
      />

      <section className="relative overflow-hidden rounded-lg border border-border bg-primary text-primary-foreground shadow-panel">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(115deg, transparent 0 22px, color-mix(in oklab, var(--primary-foreground) 6%, transparent) 22px 23px)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full opacity-20 blur-3xl"
          style={{ background: "var(--green)" }}
        />
        <div className="relative grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-sm bg-green px-2 py-0.5 text-[10px] font-bold tracking-widest text-green-foreground uppercase">
              <Sparkles className="size-3" /> Ferramenta principal
            </span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight uppercase">
              Simulador de preço
            </h2>
            <p className="mt-2 max-w-xl text-sm text-primary-foreground/80">
              Monte uma cotação em segundos: escolha o produto, ajuste margem, comissão, inadimplência
              e frete (FOB ou CIF) e copie a proposta pronta para enviar ao cliente.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {[
                `${qtd(produtosProntos)} produtos prontos para simular`,
                `Despesas ${pct(despesasPercentual, 2)}`,
                `Margem padrão ${pct(parametros.margemPadrao, 0)}`,
              ].map((chip) => (
                <span
                  key={chip}
                  className="rounded-sm border border-primary-foreground/20 bg-primary-foreground/10 px-2 py-1 font-medium text-primary-foreground/90"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-3 lg:items-end">
            <Link
              to="/precificacao"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-green px-6 py-3.5 text-base font-bold text-green-foreground shadow-lg transition hover:opacity-90"
            >
              Abrir simulador <ArrowRight className="size-5" />
            </Link>
            <ul className="space-y-1 text-xs text-primary-foreground/70 lg:text-right">
              {["Condições comerciais editáveis", "Total do lote por quantidade", "Cópia da cotação para WhatsApp/e-mail"].map(
                (item) => (
                  <li key={item} className="flex items-center gap-1.5 lg:justify-end">
                    <Check className="size-3.5 text-green" />
                    {item}
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>
      </section>


      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPI rotulo="Produtos cadastrados" valor={qtd(produtos.length)} detalhe="Lista de Produtos" />
        <KPI rotulo="Insumos" valor={qtd(listaInsumos.length)} detalhe="Custo unitário por insumo" />
        <KPI
          rotulo="Linhas de estrutura (BOM)"
          valor={qtd(bom.length)}
          detalhe="Custo MP por Produto"
        />
        <KPI
          rotulo="Pontos de atenção"
          valor={qtd(problemas.reduce((s, p) => s + p.ocorrencias, 0))}
          detalhe={`${criticos.length} categorias críticas`}
          destaque
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel
          titulo="Como o preço é formado"
          subtitulo="Regra reimplementada em código a partir dos parâmetros reais"
          className="xl:col-span-2"
        >
          <ol className="space-y-2">
            {[
              {
                t: "1. Matéria-prima",
                d: "Estrutura do produto (BOM) × custo unitário do insumo",
                v: `${bom.length} linhas reais`,
              },
              {
                t: "2. Custo de produção",
                d: "Rateio de mão de obra, manutenção, acabamento e transporte interno por setor",
                v: `${ccVigente.setores.length} setores`,
              },
              {
                t: "3. Despesas operacionais",
                d: `Média dos ${mesesDespesas} meses com faturamento, sem as despesas de frota (já incluídas no frete)`,
                v: pct(despesasPercentual, 4),
              },
              {
                t: "4. Impostos por cenário",
                d: "ICMS, PIS, COFINS, IRPJ e CSLL conforme o cenário de venda",
                v: `${impostos.cenarios.length + 1} cenários`,
              },
              {
                t: "5. Comissão e inadimplência",
                d: "Percentuais fixos aplicados sobre o preço de venda",
                v: `${pct(parametros.comissao, 0)} + ${pct(parametros.inadimplencia, 0)}`,
              },
              {
                t: "6. Margem de lucro",
                d: "Parâmetro comercial aplicado no divisor do preço",
                v: pct(parametros.margemPadrao, 0),
              },
              {
                t: "7. Frete (quando frota própria)",
                d: "Custo por km rodado dividido pelas peças por entrega",
                v: `${money(logistica.custoTotalPorKm)} / km`,
              },
            ].map((s) => (
              <li
                key={s.t}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border bg-secondary/40 px-3 py-2"
              >
                <ChevronRight className="size-4 shrink-0 text-green" />
                <span className="text-sm font-semibold text-foreground">{s.t}</span>
                <span className="min-w-0 flex-1 text-xs text-muted-foreground">{s.d}</span>
                <span className="rounded-sm bg-card px-2 py-0.5 text-xs font-semibold text-foreground">
                  {s.v}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-3 rounded-md border border-border bg-muted/60 p-3 text-xs text-muted-foreground">
            <strong className="text-foreground">Preço</strong> = (matéria-prima + produção) ÷ (1 −
            despesas − impostos − comissão − inadimplência − margem) + frete. A regra está escrita em
            código de sistema, não como fórmula de célula.
          </p>
        </Panel>

        <div className="space-y-4">
          <Panel titulo="Estrutura de custos" subtitulo="Indicadores reais da planilha">
            <dl className="space-y-2 text-sm">
              {[
                [`Despesas operacionais (média ${mesesDespesas}m, sem frota)`, pct(despesasPercentual, 4)],
                ["Custo logístico por km", money(logistica.custoTotalPorKm)],
                ["Km rodados/mês", qtd(logistica.kmRodadosMes)],
                ["Custos fixos da frota/mês", money(logistica.totalFixos)],
                [
                  "Folha MOD",
                  `${money(salarios.categorias[0]?.salarioTotal)} · ${qtd(
                    salarios.categorias[0]?.colaboradores,
                  )} col.`,
                ],
                [
                  "Folha MOI",
                  `${money(salarios.categorias[1]?.salarioTotal)} · ${qtd(
                    salarios.categorias[1]?.colaboradores,
                  )} col.`,
                ],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-3 border-b border-border pb-1.5">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-semibold tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel titulo="Integridade dos dados" subtitulo="O que a planilha não consegue vigiar">
            <ul className="space-y-2">
              {problemas.slice(0, 4).map((p) => (
                <li key={p.problema} className="flex items-start gap-2">
                  <SeverityTag nivel={p.severidade} />
                  <span className="min-w-0 text-xs text-foreground">
                    {p.problema}
                    <span className="ml-1 font-semibold">({qtd(p.ocorrencias)})</span>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel titulo="Produtos por família" subtitulo="Derivado da descrição real dos produtos">
          <ul className="space-y-2">
            {topCategorias.map(([cat, n]) => (
              <li key={cat} className="grid grid-cols-[9rem_1fr_3rem] items-center gap-2">
                <span className="truncate text-xs font-medium text-foreground">{cat}</span>
                <span className="h-2.5 rounded-sm bg-muted">
                  <span
                    className="block h-2.5 rounded-sm bg-chart-1"
                    style={{ width: `${(n / maiorCategoria) * 100}%` }}
                  />
                </span>
                <span className="text-right text-xs font-semibold tabular-nums">{qtd(n)}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          titulo="Preços calculados pelo sistema"
          subtitulo="Cenário sugerido conforme a família do produto"
          acoes={<RealTag />}
        >
          <table className="w-full">
            <thead>
              <tr>
                <Th>Produto</Th>
                <Th>Cenário</Th>
                <Th align="right">Preço</Th>
              </tr>
            </thead>
            <tbody>
              {destaques.map((d) => (
                <tr key={d.produto} className="odd:bg-secondary/30">
                  <Td className="max-w-[18rem] truncate">{d.produto}</Td>
                  <Td className="text-xs">{d.cenario}</Td>
                  <Td align="right" className="font-semibold">
                    {money(d.preco)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted-foreground">
            <DemoTag>Protótipo</DemoTag> Valores calculados em tempo real a partir da estrutura de
            cada produto. Não substituem a tabela oficial de preços.
          </p>
        </Panel>
      </div>
    </>
  );
}

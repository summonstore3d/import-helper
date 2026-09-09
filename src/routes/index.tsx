import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ChevronRight } from "lucide-react";
import {
  bom,
  centroCustos,
  despesas,
  impostos,
  insumos,
  logistica,
  parametros,
  produtos,
  salarios,
  categoriaDoProduto,
} from "@/data";
import { checks } from "@/lib/checks";
import { money, pct, qtd } from "@/lib/format";
import { cenarioSugerido, precoRapido } from "@/lib/pricing";
import { DemoTag, KPI, Panel, PageHeader, RealTag, SeverityTag, Td, Th } from "@/components/ui-kit";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel de Precificação — Protótipo D'AGOSTINI" },
      {
        name: "description",
        content:
          "Painel executivo do protótipo de precificação: 246 produtos, 32 insumos, estruturas de custo e formação de preço em um sistema web.",
      },
      { property: "og:title", content: "Painel de Precificação — Protótipo D'AGOSTINI" },
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
  const problemas = checks();
  const criticos = problemas.filter((p) => p.severidade === "CRÍTICO");
  const categorias = new Map<string, number>();
  produtos.forEach((p) => {
    const c = categoriaDoProduto(p.full);
    categorias.set(c, (categorias.get(c) ?? 0) + 1);
  });
  const topCategorias = Array.from(categorias.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maiorCategoria = topCategorias[0]?.[1] ?? 1;

  const destaques = produtos
    .slice(0, 200)
    .map((p) => ({ produto: p.full, cenario: cenarioSugerido(p.full), preco: precoRapido(p.full) }))
    .filter((p) => p.preco !== null)
    .slice(0, 6);

  return (
    <>
      <PageHeader
        titulo="Painel de Precificação"
        aba="Menu"
        descricao="Visão executiva do protótipo. Todos os números abaixo vêm da planilha “Ferramenta de Precificação Atualizada 28.08.2026”; nenhum dado foi inventado."
        acoes={
          <Link
            to="/precificacao"
            className="inline-flex items-center gap-1.5 rounded-sm bg-green px-3 py-2 text-sm font-semibold text-green-foreground hover:opacity-90"
          >
            Simular preço <ArrowRight className="size-4" />
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPI rotulo="Produtos cadastrados" valor={qtd(produtos.length)} detalhe="Lista de Produtos" />
        <KPI rotulo="Insumos" valor={qtd(insumos.length)} detalhe="Custo unitário por insumo" />
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
                v: `${centroCustos.setores.length} setores`,
              },
              {
                t: "3. Despesas operacionais",
                d: "Média dos últimos 12 meses do demonstrativo de resultado",
                v: pct(despesas.mediaDespesas, 4),
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
                ["Despesas operacionais (média 12m)", pct(despesas.mediaDespesas, 4)],
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
            <Link
              to="/validacoes"
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              Ver todas as validações <ArrowRight className="size-3.5" />
            </Link>
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

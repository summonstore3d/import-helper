import { createFileRoute } from "@tanstack/react-router";
import { impostos } from "@/data";
import { money, pct } from "@/lib/format";
import { simplesVigente } from "@/lib/correcoes";
import { DemoTag, KPI, PageHeader, Panel, RealTag, Td, Th } from "@/components/ui-kit";

export const Route = createFileRoute("/impostos")({
  head: () => ({
    meta: [
      { title: "Impostos — Cenários de Venda" },
      {
        name: "description",
        content:
          "Cenários tributários da precificação: venda normal, venda com base reduzida e venda pelo Simples, com ICMS, PIS, COFINS, IRPJ e CSLL.",
      },
      { property: "og:title", content: "Impostos — Cenários de Venda" },
      {
        property: "og:description",
        content: "Carga tributária por família de produto e por cenário de venda.",
      },
    ],
  }),
  component: Impostos,
});

function Impostos() {
  const t = impostos.tonial;
  const s = simplesVigente;

  return (
    <>
      <PageHeader
        titulo="Impostos"
        aba="Impostos"
        descricao="A carga tributária muda conforme a família do produto e o cenário de venda. No sistema, o cenário é escolhido na precificação e a alíquota é aplicada automaticamente, sem trocar de aba."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KPI rotulo="Cenários cadastrados" valor={String(impostos.cenarios.length + 1)} />
        <KPI
          rotulo="Alíquota efetiva — Simples"
          valor={pct(s.aliquotaEfetiva, 4)}
          detalhe={`Nominal ${pct(s.aliquotaNominal, 2)} menos a dedução da faixa`}
        />
        <KPI rotulo="Faturamento 12 meses" valor={money(t.faturamento12m)} destaque />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {impostos.cenarios.map((c) => (
          <Panel key={c.nome} titulo={c.nome} acoes={<RealTag />} bodyClassName="p-0">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Família</Th>
                  <Th align="right">ICMS</Th>
                  <Th align="right">PIS</Th>
                  <Th align="right">COFINS</Th>
                  <Th align="right">IRPJ</Th>
                  <Th align="right">CSLL</Th>
                  <Th align="right">Total</Th>
                </tr>
              </thead>
              <tbody>
                {c.itens.map((i) => (
                  <tr key={i.produto} className="odd:bg-secondary/30">
                    <Td className="font-medium">{i.produto}</Td>
                    <Td align="right">{pct(i.icms, 0)}</Td>
                    <Td align="right">{pct(i.pis, 2)}</Td>
                    <Td align="right">{pct(i.cofins, 1)}</Td>
                    <Td align="right">{pct(i.irpj, 2)}</Td>
                    <Td align="right">{pct(i.csll, 1)}</Td>
                    <Td align="right" className="font-bold">
                      {pct(i.total, 2)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        ))}

        <Panel
          titulo={`Cenário Simples — ${t.nome}`}
          subtitulo="Alíquota efetiva por faixa de faturamento"
          acoes={<RealTag />}
        >
          <dl className="mb-3 grid gap-2 sm:grid-cols-2">
            {[
              ["Faturamento 12 meses", money(t.faturamento12m)],
              ["Faturamento do mês", money(t.faturamentoMes)],
              ["Alíquota nominal da faixa", pct(s.aliquotaNominal, 4)],
              ["Parcela a deduzir", money(s.valorDeduzir)],
              ["Alíquota efetiva aplicada no preço", pct(s.aliquotaEfetiva, 4)],
              ["Tributo do mês", money(t.tributoMes)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-border pb-1 text-sm">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <table className="w-full">
            <thead>
              <tr>
                <Th align="right">De</Th>
                <Th align="right">Até</Th>
                <Th align="right">Alíquota</Th>
                <Th align="right">Dedução</Th>
              </tr>
            </thead>
            <tbody>
              {t.faixas.map((f, i) => (
                <tr key={i} className="odd:bg-secondary/30">
                  <Td align="right">{money(f.de)}</Td>
                  <Td align="right">{money(f.ate)}</Td>
                  <Td align="right">{pct(f.aliquota, 2)}</Td>
                  <Td align="right">{money(f.deduzir)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 rounded-sm border border-warn bg-demo px-2 py-1.5 text-xs text-demo-foreground">
            <DemoTag>Correção aplicada</DemoTag> A planilha aplicava a alíquota nominal da faixa
            (10%). O sistema aplica a alíquota efetiva: (faturamento de 12 meses × alíquota nominal −
            parcela a deduzir) ÷ faturamento de 12 meses.
          </p>
        </Panel>
      </div>
    </>
  );
}

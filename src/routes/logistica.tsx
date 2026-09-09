import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { logistica, parametros } from "@/data";
import { money, moneyPreciso, qtd } from "@/lib/format";
import { KPI, PageHeader, Panel, RealTag, Td, Th, DemoTag } from "@/components/ui-kit";

export const Route = createFileRoute("/logistica")({
  head: () => ({
    meta: [
      { title: "Logística — Custo por Km e Frete" },
      {
        name: "description",
        content:
          "Custos fixos e variáveis da frota própria, custo total por quilômetro rodado e simulador de frete por entrega.",
      },
      { property: "og:title", content: "Logística — Custo por Km e Frete" },
      {
        property: "og:description",
        content: "Como o frete entra na formação do preço quando a entrega usa frota própria.",
      },
    ],
  }),
  component: Logistica,
});

function Logistica() {
  const [km, setKm] = useState(parametros.kmPadrao);
  const [pecas, setPecas] = useState(parametros.pecasPorEntregaPadrao);

  const custoViagem = km * logistica.custoTotalPorKm;
  const fretePorPeca =
    pecas > 0 ? (km / pecas) * logistica.custoTotalPorKm * parametros.fatorFrete : 0;

  return (
    <>
      <PageHeader
        titulo="Logística"
        aba="Logística"
        descricao="A frota própria tem custo fixo mensal e custo variável por quilômetro. O sistema converte isso em frete por peça entregue e injeta o valor no preço final."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPI rotulo="Custos fixos / mês" valor={money(logistica.totalFixos)} />
        <KPI rotulo="Custo variável / km" valor={moneyPreciso(logistica.totalVariaveisPorKm)} />
        <KPI rotulo="Km rodados / mês" valor={qtd(logistica.kmRodadosMes)} />
        <KPI rotulo="Custo total / km" valor={moneyPreciso(logistica.custoTotalPorKm)} destaque />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel titulo="Custos fixos" subtitulo="Valores mensais" acoes={<RealTag />} bodyClassName="p-0">
          <table className="w-full">
            <thead>
              <tr>
                <Th>Item</Th>
                <Th align="right">Valor</Th>
              </tr>
            </thead>
            <tbody>
              {logistica.fixos.map((f) => (
                <tr key={f.item} className="odd:bg-secondary/30">
                  <Td>{f.item}</Td>
                  <Td align="right">{money(f.valor)}</Td>
                </tr>
              ))}
              <tr className="bg-table-total font-bold">
                <Td>Total</Td>
                <Td align="right">{money(logistica.totalFixos)}</Td>
              </tr>
            </tbody>
          </table>
        </Panel>

        <Panel titulo="Variáveis" subtitulo="Diesel, consumo e manutenção" acoes={<RealTag />} bodyClassName="p-0">
          <table className="w-full">
            <thead>
              <tr>
                <Th>Item</Th>
                <Th align="right">Valor</Th>
              </tr>
            </thead>
            <tbody>
              {logistica.variaveis.map((f) => (
                <tr key={f.item} className="odd:bg-secondary/30">
                  <Td>{f.item}</Td>
                  <Td align="right">{moneyPreciso(f.valor)}</Td>
                </tr>
              ))}
              <tr className="bg-table-total font-bold">
                <Td>Custo variável por km</Td>
                <Td align="right">{moneyPreciso(logistica.totalVariaveisPorKm)}</Td>
              </tr>
            </tbody>
          </table>
        </Panel>

        <Panel titulo="Simulador de frete" subtitulo="Valor embutido no preço de venda">
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="font-semibold">Distância da entrega (km)</span>
              <input
                type="number"
                value={km}
                onChange={(e) => setKm(Number(e.target.value))}
                className="mt-1 h-9 w-full rounded-sm border border-input bg-background px-2 text-sm tabular-nums outline-none focus:border-ring"
              />
            </label>
            <label className="block text-sm">
              <span className="font-semibold">Peças por entrega</span>
              <input
                type="number"
                value={pecas}
                onChange={(e) => setPecas(Number(e.target.value))}
                className="mt-1 h-9 w-full rounded-sm border border-input bg-background px-2 text-sm tabular-nums outline-none focus:border-ring"
              />
            </label>
            <dl className="space-y-1.5 rounded-md border border-border bg-secondary/40 p-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Custo da viagem</dt>
                <dd className="font-semibold">{money(custoViagem)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Fator aplicado (ida e volta)</dt>
                <dd className="font-semibold">{qtd(parametros.fatorFrete)}×</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5">
                <dt className="font-semibold">Frete por peça</dt>
                <dd className="font-bold">{money(fretePorPeca)}</dd>
              </div>
            </dl>
            <p className="text-xs text-muted-foreground">
              <DemoTag>Protótipo</DemoTag> Em produção, a distância viria do endereço do cliente via
              geolocalização, eliminando a digitação manual do km.
            </p>
          </div>
        </Panel>
      </div>
    </>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { bom, insumos } from "@/data";
import { isNum, money, moneyPreciso, qtd } from "@/lib/format";
import { KPI, PageHeader, Panel, RealTag, Td, Th } from "@/components/ui-kit";

export const Route = createFileRoute("/insumos")({
  head: () => ({
    meta: [
      { title: "Insumos — Protótipo de Precificação" },
      {
        name: "description",
        content:
          "Cadastro de insumos reais (cimento, areia, ferro, aditivos) com custo unitário e uso nas estruturas de produto.",
      },
      { property: "og:title", content: "Insumos — Protótipo de Precificação" },
      {
        property: "og:description",
        content: "Custo unitário de cada insumo e em quantos produtos ele é consumido.",
      },
    ],
  }),
  component: Insumos,
});

function Insumos() {
  const [busca, setBusca] = useState("");

  const linhas = useMemo(() => {
    const uso = new Map<string, { produtos: Set<string>; consumo: number; custo: number }>();
    for (const l of bom) {
      const at = uso.get(l.item) ?? { produtos: new Set<string>(), consumo: 0, custo: 0 };
      at.produtos.add(l.produto);
      at.consumo += isNum(l.quantidade) ? l.quantidade : 0;
      at.custo += isNum(l.custoTotal) ? l.custoTotal : 0;
      uso.set(l.item, at);
    }
    return insumos
      .map((i) => {
        const u = uso.get(i.full);
        return {
          ...i,
          produtos: u?.produtos.size ?? 0,
          consumo: u?.consumo ?? 0,
          custoAcumulado: u?.custo ?? 0,
          unidade: bom.find((l) => l.item === i.full)?.unidade ?? "—",
        };
      })
      .sort((a, b) => b.custoAcumulado - a.custoAcumulado);
  }, []);

  const filtradas = linhas.filter((l) => l.full.toLowerCase().includes(busca.toLowerCase()));
  const semCusto = linhas.filter((l) => !isNum(l.custoUnitario)).length;
  const semUso = linhas.filter((l) => l.produtos === 0).length;

  return (
    <>
      <PageHeader
        titulo="Insumos"
        aba="Insumos"
        descricao="Base única de custos de matéria-prima. Quando um insumo é atualizado aqui, todos os produtos que o consomem são reprecificados — sem propagar fórmulas manualmente."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPI rotulo="Insumos cadastrados" valor={qtd(insumos.length)} />
        <KPI rotulo="Sem custo unitário" valor={qtd(semCusto)} detalhe="Bloqueia o cálculo do preço" />
        <KPI rotulo="Sem uso em estruturas" valor={qtd(semUso)} detalhe="Possível cadastro obsoleto" />
        <KPI
          rotulo="Custo acumulado nas estruturas"
          valor={money(linhas.reduce((s, l) => s + l.custoAcumulado, 0))}
          detalhe="Soma de todas as linhas de BOM"
          destaque
        />
      </div>

      <Panel
        className="mt-4"
        titulo={`${qtd(filtradas.length)} insumos`}
        subtitulo="Ordenados pelo peso no custo total das estruturas"
        acoes={
          <>
            <RealTag />
            <div className="relative">
              <Search className="pointer-events-none absolute top-2 left-2 size-4 text-muted-foreground" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar insumo"
                className="h-8 w-52 rounded-sm border border-input bg-background pr-2 pl-8 text-sm outline-none focus:border-ring"
              />
            </div>
          </>
        }
        bodyClassName="p-0"
      >
        <div className="max-h-[62vh] overflow-auto">
          <table className="w-full">
            <thead>
              <tr>
                <Th>Código</Th>
                <Th>Descrição</Th>
                <Th align="right">Custo unitário</Th>
                <Th>Unidade</Th>
                <Th align="right">Produtos que usam</Th>
                <Th align="right">Consumo total (BOM)</Th>
                <Th align="right">Custo acumulado</Th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((l) => (
                <tr key={l.full} className="odd:bg-secondary/30">
                  <Td className="font-semibold">{l.codigo}</Td>
                  <Td className="max-w-[24rem] truncate">{l.descricao}</Td>
                  <Td align="right">{moneyPreciso(l.custoUnitario)}</Td>
                  <Td>{l.unidade}</Td>
                  <Td align="right">{qtd(l.produtos)}</Td>
                  <Td align="right">{qtd(l.consumo)}</Td>
                  <Td align="right" className="font-semibold">
                    {money(l.custoAcumulado)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

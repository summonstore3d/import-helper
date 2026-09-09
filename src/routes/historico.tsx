import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { money, pct, dataBR } from "@/lib/format";
import { usePrototype } from "@/state/prototype";
import { DemoTag, KPI, PageHeader, Panel, Td, Th } from "@/components/ui-kit";

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de Preços — Protótipo de Precificação" },
      {
        name: "description",
        content:
          "Versionamento de preços por produto: preço vigente, versões substituídas e simulações, com custo e margem de cada momento.",
      },
      { property: "og:title", content: "Histórico de Preços — Protótipo de Precificação" },
      {
        property: "og:description",
        content: "O que a planilha não guarda: a evolução do preço e do custo ao longo do tempo.",
      },
    ],
  }),
  component: Historico,
});

function Historico() {
  const { historico } = usePrototype();
  const produtosLista = useMemo(
    () => Array.from(new Set(historico.map((h) => h.produto))),
    [historico],
  );
  const [filtro, setFiltro] = useState("TODOS");

  const linhas = historico
    .filter((h) => filtro === "TODOS" || h.produto === filtro)
    .sort((a, b) => b.data.localeCompare(a.data));

  const vigentes = historico.filter((h) => h.status === "Vigente");
  const simulacoes = historico.filter((h) => h.status === "Simulação");

  return (
    <>
      <PageHeader
        titulo="Histórico de Preços"
        descricao="Uma planilha sobrescreve o passado. O sistema guarda cada versão de preço com custo, margem, cenário e data — permitindo explicar à diretoria por que o preço mudou."
        acoes={
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="h-9 max-w-[24rem] rounded-sm border border-input bg-background px-2 text-sm outline-none focus:border-ring"
          >
            <option value="TODOS">Todos os produtos</option>
            {produtosLista.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KPI rotulo="Versões registradas" valor={String(historico.length)} />
        <KPI rotulo="Preços vigentes" valor={String(vigentes.length)} />
        <KPI
          rotulo="Simulações desta sessão"
          valor={String(simulacoes.length)}
          detalhe="Salvas na tela de Precificação"
          destaque
        />
      </div>

      <Panel
        className="mt-4"
        titulo="Linha do tempo de preços"
        subtitulo="Custo e margem que sustentavam cada preço"
        bodyClassName="p-0"
      >
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full">
            <thead>
              <tr>
                <Th>Data</Th>
                <Th>Produto</Th>
                <Th>Cenário</Th>
                <Th align="right">Custo</Th>
                <Th align="right">Margem</Th>
                <Th align="right">Preço</Th>
                <Th align="center">Status</Th>
                <Th align="center">Origem</Th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((h) => (
                <tr key={h.id} className="odd:bg-secondary/30">
                  <Td className="whitespace-nowrap">{dataBR(h.data)}</Td>
                  <Td className="max-w-[20rem] truncate">{h.produto}</Td>
                  <Td className="text-xs">{h.cenario}</Td>
                  <Td align="right">{money(h.custo)}</Td>
                  <Td align="right">{pct(h.margem, 2)}</Td>
                  <Td align="right" className="font-semibold">
                    {money(h.preco)}
                  </Td>
                  <Td align="center">
                    <span
                      className={
                        h.status === "Vigente"
                          ? "rounded-sm bg-green-soft px-2 py-0.5 text-[10px] font-bold text-accent-foreground uppercase"
                          : h.status === "Simulação"
                            ? "rounded-sm bg-demo px-2 py-0.5 text-[10px] font-bold text-demo-foreground uppercase"
                            : "rounded-sm bg-secondary px-2 py-0.5 text-[10px] font-bold text-secondary-foreground uppercase"
                      }
                    >
                      {h.status}
                    </span>
                  </Td>
                  <Td align="center" className="text-xs text-muted-foreground">
                    {h.origem === "Demonstrativo" ? <DemoTag>Demonstrativo</DemoTag> : "Sessão"}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <p className="mt-4 rounded-md border border-border bg-muted/60 p-3 text-xs text-muted-foreground">
        <DemoTag>Protótipo</DemoTag> As versões anteriores exibidas são séries demonstrativas
        construídas a partir dos custos reais de cada produto, apenas para ilustrar o comportamento do
        versionamento. Os preços vigentes são calculados com os dados reais da planilha.
      </p>
    </>
  );
}

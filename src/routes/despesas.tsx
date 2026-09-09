import { createFileRoute } from "@tanstack/react-router";
import { despesas } from "@/data";
import { isNum, money, pct } from "@/lib/format";
import { despesasVigentes } from "@/lib/correcoes";
import { KPI, PageHeader, Panel, RealTag, Td, Th } from "@/components/ui-kit";

export const Route = createFileRoute("/despesas")({
  head: () => ({
    meta: [
      { title: "Despesas — Demonstrativo de 12 Meses" },
      {
        name: "description",
        content:
          "Demonstrativo de resultado dos últimos 12 meses: custo de mercadoria, despesas administrativas, comerciais e o percentual médio aplicado no preço.",
      },
      { property: "og:title", content: "Despesas — Demonstrativo de 12 Meses" },
      {
        property: "og:description",
        content: "De onde sai o percentual de despesas operacionais usado na precificação.",
      },
    ],
  }),
  component: Despesas,
});

function Despesas() {
  const mesesComDado = despesas.linhas[0]?.valores.filter((v) => isNum(v.valor)).length ?? 0;

  return (
    <>
      <PageHeader
        titulo="Despesas Operacionais"
        aba="Despesas"
        descricao="O demonstrativo mensal alimenta o percentual de despesas usado na precificação. No sistema, este número deixa de ser digitado e passa a ser calculado a partir do resultado contábil."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KPI rotulo="Meses no demonstrativo" valor={String(despesas.meses.length)} detalhe={`${mesesComDado} meses fechados`} />
        <KPI rotulo="Linhas de conta" valor={String(despesas.linhas.length)} />
        <KPI
          rotulo="% de despesas aplicado no preço"
          valor={pct(despesasVigentes.ponderada, 4)}
          detalhe={`Taxa ponderada: ${money(despesasVigentes.somaDespesas)} de despesa sobre ${money(
            despesasVigentes.somaReceita,
          )} de receita em ${despesasVigentes.meses} meses`}
          destaque
        />
      </div>

      <p className="mt-4 rounded-md border border-warn bg-demo px-3 py-2 text-sm text-demo-foreground">
        <strong>Correção aplicada:</strong> a planilha usava a média simples das razões mensais (
        {pct(despesasVigentes.mediaSimples, 4)}), dando o mesmo peso a meses de faturamento alto e
        baixo. O sistema usa a taxa ponderada (soma das despesas ÷ soma das receitas):{" "}
        {pct(despesasVigentes.ponderada, 4)} — diferença de {pct(despesasVigentes.diferenca, 4)}.
      </p>

      <Panel
        className="mt-4"
        titulo="Demonstrativo mensal"
        subtitulo="Valores e participação sobre a receita, por conta"
        acoes={<RealTag />}
        bodyClassName="p-0"
      >
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <Th className="left-0 z-20">Conta</Th>
                {despesas.meses.map((m) => (
                  <Th key={m} align="right">
                    {m.slice(0, 3)}
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {despesas.linhas.map((l, i) => (
                <tr
                  key={`${l.nome}-${i}`}
                  className={l.tipo === "grupo" ? "bg-table-group font-semibold" : "odd:bg-secondary/30"}
                >
                  <Td className="max-w-[16rem] truncate">{l.nome}</Td>
                  {l.valores.map((v, j) => (
                    <Td key={j} align="right" className="whitespace-nowrap">
                      {isNum(v.valor) ? money(v.valor) : "–"}
                    </Td>
                  ))}
                </tr>
              ))}
              {despesas.rodape.map((r, i) => (
                <tr key={`${r.nome}-${i}`} className="bg-table-total font-bold">
                  <Td>{r.nome}</Td>
                  {r.valores.map((v, j) => (
                    <Td key={j} align="right" className="whitespace-nowrap">
                      {isNum(v) ? (Math.abs(v) < 1 ? pct(v, 2) : money(v)) : "–"}
                    </Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

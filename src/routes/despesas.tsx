import { createFileRoute } from "@tanstack/react-router";
import { despesas } from "@/data";
import { isNum, money, pct } from "@/lib/format";
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
          rotulo="% médio de despesas aplicado no preço"
          valor={pct(despesas.mediaDespesas, 4)}
          detalhe="Parâmetro usado no motor de cálculo"
          destaque
        />
      </div>

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

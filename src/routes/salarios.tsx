import { createFileRoute } from "@tanstack/react-router";
import { salarios } from "@/data";
import { money, qtd } from "@/lib/format";
import { KPI, PageHeader, Panel, RealTag, Td, Th } from "@/components/ui-kit";

export const Route = createFileRoute("/salarios")({
  head: () => ({
    meta: [
      { title: "Salários — Base do Rateio Industrial" },
      {
        name: "description",
        content:
          "Folha de mão de obra direta e indireta, número de colaboradores e salário médio que alimentam o rateio do centro de custos.",
      },
      { property: "og:title", content: "Salários — Base do Rateio Industrial" },
      {
        property: "og:description",
        content: "MOD e MOI: a folha que se transforma em custo por hora de setor.",
      },
    ],
  }),
  component: Salarios,
});

function Salarios() {
  const total = salarios.categorias.reduce((s, c) => s + (c.salarioTotal ?? 0), 0);
  const colaboradores = salarios.categorias.reduce((s, c) => s + (c.colaboradores ?? 0), 0);

  return (
    <>
      <PageHeader
        titulo="Salários"
        aba="Salários"
        descricao="Mão de obra direta (MOD) e indireta (MOI) são a base do rateio industrial. O sistema recebe esses números do departamento pessoal e propaga automaticamente para o custo por hora de cada setor."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KPI rotulo="Folha total considerada" valor={money(total)} />
        <KPI rotulo="Colaboradores" valor={qtd(colaboradores)} />
        <KPI
          rotulo="Salário médio geral"
          valor={money(colaboradores > 0 ? total / colaboradores : null)}
          destaque
        />
      </div>

      <Panel className="mt-4" titulo="Categorias" acoes={<RealTag />} bodyClassName="p-0">
        <table className="w-full">
          <thead>
            <tr>
              <Th>Categoria</Th>
              <Th align="right">Salário total</Th>
              <Th align="right">Colaboradores</Th>
              <Th align="right">Salário médio</Th>
            </tr>
          </thead>
          <tbody>
            {salarios.categorias.map((c) => (
              <tr key={c.categoria} className="odd:bg-secondary/30">
                <Td className="font-semibold">{c.categoria}</Td>
                <Td align="right">{money(c.salarioTotal)}</Td>
                <Td align="right">{qtd(c.colaboradores)}</Td>
                <Td align="right" className="font-semibold">
                  {money(c.salarioMedio)}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel
        className="mt-4"
        titulo="Regras de preenchimento herdadas da planilha"
        subtitulo="Observações que hoje vivem em texto solto e viram validação de sistema"
      >
        <ul className="space-y-2">
          {salarios.observacoes.map((o) => (
            <li
              key={o}
              className="rounded-md border-l-4 border-l-warn border-border bg-secondary/40 px-3 py-2 text-sm text-foreground"
            >
              {o}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Essas instruções são exatamente o tipo de conhecimento tácito que se perde em uma planilha.
          No sistema, cada uma delas se torna uma regra automática ou uma validação obrigatória.
        </p>
      </Panel>
    </>
  );
}

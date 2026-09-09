import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { checks, ordemSeveridade, type Severidade } from "@/lib/checks";
import { qtd } from "@/lib/format";
import { DemoTag, KPI, PageHeader, Panel, RealTag, SeverityTag, Td, Th } from "@/components/ui-kit";

export const Route = createFileRoute("/validacoes")({
  head: () => ({
    meta: [
      { title: "Validações — Integridade dos Dados de Precificação" },
      {
        name: "description",
        content:
          "Checagens automáticas sobre os dados reais: produtos sem estrutura, referências quebradas, insumos sem custo e famílias sem regra tributária.",
      },
      { property: "og:title", content: "Validações — Integridade dos Dados" },
      {
        property: "og:description",
        content: "O que a planilha não vigia e um sistema bloqueia antes de gerar preço errado.",
      },
    ],
  }),
  component: Validacoes,
});

function Validacoes() {
  const lista = checks().sort(
    (a, b) => ordemSeveridade.indexOf(a.severidade) - ordemSeveridade.indexOf(b.severidade),
  );
  const [nivel, setNivel] = useState<Severidade | "TODOS">("TODOS");
  const filtradas = lista.filter((c) => nivel === "TODOS" || c.severidade === nivel);
  const porNivel = (n: Severidade) =>
    lista.filter((c) => c.severidade === n).reduce((s, c) => s + c.ocorrencias, 0);

  return (
    <>
      <PageHeader
        titulo="Validações"
        descricao="Diagnóstico executado sobre os dados reais da planilha no momento em que esta tela abre. Cada item aponta o problema, o impacto no preço e a ação corretiva."
        acoes={
          <select
            value={nivel}
            onChange={(e) => setNivel(e.target.value as Severidade | "TODOS")}
            className="h-9 rounded-sm border border-input bg-background px-2 text-sm outline-none focus:border-ring"
          >
            {["TODOS", ...ordemSeveridade].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {ordemSeveridade.map((n) => (
          <KPI
            key={n}
            rotulo={`Ocorrências ${n.toLowerCase()}`}
            valor={qtd(porNivel(n))}
            detalhe={`${lista.filter((c) => c.severidade === n).length} tipos de problema`}
            destaque={n === "CRÍTICO"}
          />
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {filtradas.map((c) => (
          <Panel key={c.problema} bodyClassName="p-0">
            <div className="flex flex-wrap items-start gap-3 border-b border-border bg-secondary/50 px-4 py-3">
              <SeverityTag nivel={c.severidade} />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-foreground">{c.problema}</h3>
                <p className="text-xs text-muted-foreground">Origem: {c.origem}</p>
              </div>
              <div className="text-right">
                <p className="text-xl leading-none font-bold text-foreground">{qtd(c.ocorrencias)}</p>
                <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
                  ocorrências
                </p>
              </div>
              {c.fonte === "dados reais" ? <RealTag>Verificado nos dados</RealTag> : <DemoTag />}
            </div>
            <div className="grid gap-4 p-4 md:grid-cols-3">
              <div>
                <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Impacto no preço
                </p>
                <p className="mt-1 text-sm">{c.impacto}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Ação corretiva
                </p>
                <p className="mt-1 text-sm">{c.acao}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Exemplos
                </p>
                <ul className="mt-1 space-y-0.5">
                  {c.exemplos.map((e) => (
                    <li key={e} className="truncate text-xs text-foreground" title={e}>
                      • {e}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Panel>
        ))}
      </div>

      <Panel className="mt-4" titulo="Por que isso importa" bodyClassName="p-4">
        <table className="w-full">
          <thead>
            <tr>
              <Th>Situação</Th>
              <Th>Na planilha hoje</Th>
              <Th>No sistema proposto</Th>
            </tr>
          </thead>
          <tbody>
            {[
              [
                "Produto sem estrutura",
                "Célula de custo fica vazia e o preço sai incompleto",
                "Preço é bloqueado e o produto entra em fila de pendências",
              ],
              [
                "Referência quebrada (#REF!)",
                "Erro se propaga silenciosamente por várias abas",
                "Motor de cálculo recusa o dado e aponta o setor de origem",
              ],
              [
                "Insumo com custo desatualizado",
                "Depende de alguém lembrar de atualizar e recopiar fórmulas",
                "Atualização única reprecifica todos os produtos afetados",
              ],
              [
                "Alteração de margem",
                "Sem registro de quem mudou nem quando",
                "Auditoria com usuário, data, valor anterior e motivo",
              ],
            ].map(([a, b, c]) => (
              <tr key={a} className="odd:bg-secondary/30">
                <Td className="font-semibold">{a}</Td>
                <Td className="text-sm text-muted-foreground">{b}</Td>
                <Td className="text-sm">{c}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </>
  );
}

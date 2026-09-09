import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { centroCustos, guiaCdc } from "@/data";
import { isNum, money, pct, qtd, REF_INCONSISTENTE } from "@/lib/format";
import { KPI, PageHeader, Panel, RealTag, Td, Th } from "@/components/ui-kit";

export const Route = createFileRoute("/centro-de-custos")({
  head: () => ({
    meta: [
      { title: "Centro de Custos — Protótipo de Precificação" },
      {
        name: "description",
        content:
          "Setores produtivos, rateio de mão de obra e manutenção, horas disponíveis e custo por hora real de cada centro de custo.",
      },
      { property: "og:title", content: "Centro de Custos — Protótipo de Precificação" },
      {
        property: "og:description",
        content: "Custo por hora de cada setor produtivo e roteiro de produção por produto.",
      },
    ],
  }),
  component: CentroDeCustos,
});

function valor(v: number | string | null, tipo: "money" | "pct" | "num") {
  if (!isNum(v)) return <span className="text-xs text-destructive">{REF_INCONSISTENTE}</span>;
  return tipo === "money" ? money(v) : tipo === "pct" ? pct(v, 0) : qtd(v);
}

function CentroDeCustos() {
  const [aba, setAba] = useState<"setores" | "roteiro" | "guia">("setores");
  const quebrados = centroCustos.setores.filter((s) => !isNum(s.horaReal)).length;

  return (
    <>
      <PageHeader
        titulo="Centro de Custos"
        aba="Centro de Custos + Guia - CDC"
        descricao="O rateio industrial que transforma folha de pagamento e manutenção em custo por hora de setor, e este em custo de produção por produto."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPI rotulo="Setores produtivos" valor={qtd(centroCustos.setores.length)} />
        <KPI rotulo="Produtos com roteiro" valor={qtd(centroCustos.roteiro.length)} />
        <KPI rotulo="Funções mapeadas" valor={qtd(guiaCdc.maoDeObra.length)} detalhe="Guia - CDC" />
        <KPI
          rotulo="Setores com referência quebrada"
          valor={qtd(quebrados)}
          detalhe="Erro herdado da planilha"
          destaque
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {[
          ["setores", "Custo por setor"],
          ["roteiro", "Roteiro por produto"],
          ["guia", "Rateio de mão de obra"],
        ].map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => setAba(k as typeof aba)}
            className={
              aba === k
                ? "rounded-sm bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground uppercase"
                : "rounded-sm border border-input px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase"
            }
          >
            {l}
          </button>
        ))}
      </div>

      {aba === "setores" ? (
        <Panel
          className="mt-4"
          titulo="Custo por setor"
          subtitulo="Mão de obra, manutenção, eficiência e horas disponíveis"
          acoes={<RealTag />}
          bodyClassName="p-0"
        >
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Setor</Th>
                  <Th>Grupo</Th>
                  <Th align="right">Mão de obra</Th>
                  <Th align="right">Manutenção</Th>
                  <Th align="right">Total mês</Th>
                  <Th align="right">Eficiência</Th>
                  <Th align="right">Transp. interno</Th>
                  <Th align="right">Horas disp.</Th>
                  <Th align="right">$/h ideal</Th>
                  <Th align="right">$/h real</Th>
                </tr>
              </thead>
              <tbody>
                {centroCustos.setores.map((s, i) => (
                  <tr key={`${s.nome}-${i}`} className="odd:bg-secondary/30">
                    <Td className="font-semibold">{s.nome}</Td>
                    <Td className="text-xs">{s.grupo ?? "—"}</Td>
                    <Td align="right">{valor(s.maoDeObra, "money")}</Td>
                    <Td align="right">{s.manutencao === null ? "—" : valor(s.manutencao, "money")}</Td>
                    <Td align="right">{valor(s.mesTotal, "money")}</Td>
                    <Td align="right">{valor(s.eficienciaPerdida, "pct")}</Td>
                    <Td align="right">{valor(s.transporteInterno, "money")}</Td>
                    <Td align="right">{valor(s.horasDisponiveis, "num")}</Td>
                    <Td align="right">{valor(s.horaIdeal, "money")}</Td>
                    <Td align="right" className="font-semibold">
                      {valor(s.horaReal, "money")}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      {aba === "roteiro" ? (
        <Panel
          className="mt-4"
          titulo="Roteiro de produção por produto"
          subtitulo="Setor, tempo, armação, pintura e custo de produção"
          acoes={<RealTag />}
          bodyClassName="p-0"
        >
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Produto</Th>
                  <Th>Setor</Th>
                  <Th align="right">$/h setor</Th>
                  <Th align="right">Horas/produto</Th>
                  <Th align="right">Central</Th>
                  <Th align="right">Armação</Th>
                  <Th align="right">Pintura</Th>
                  <Th align="right">Kg/produto</Th>
                  <Th align="right">Custo produção</Th>
                </tr>
              </thead>
              <tbody>
                {centroCustos.roteiro.slice(0, 300).map((r, i) => (
                  <tr key={`${r.produto}-${i}`} className="odd:bg-secondary/30">
                    <Td className="max-w-[20rem] truncate">{r.produto}</Td>
                    <Td className="text-xs">{r.setor ?? "—"}</Td>
                    <Td align="right">{valor(r.horaSetor, "money")}</Td>
                    <Td align="right">{valor(r.horaProduto, "num")}</Td>
                    <Td align="right">{valor(r.central, "money")}</Td>
                    <Td align="right">{valor(r.custoArmacao, "money")}</Td>
                    <Td align="right">{valor(r.pintura, "money")}</Td>
                    <Td align="right">{valor(r.kgPorProduto, "num")}</Td>
                    <Td align="right" className="font-semibold">
                      {valor(r.custoProducao, "money")}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      {aba === "guia" ? (
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <Panel
            titulo="Alocação de mão de obra por função"
            subtitulo="Guia - CDC: quantas pessoas de cada função em cada setor"
            bodyClassName="p-0"
          >
            <div className="max-h-[52vh] overflow-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <Th>Função</Th>
                    {Object.keys(guiaCdc.maoDeObra[0]?.valores ?? {}).map((c) => (
                      <Th key={c} align="right">
                        {c}
                      </Th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {guiaCdc.maoDeObra.map((f) => (
                    <tr key={f.funcao} className="odd:bg-secondary/30">
                      <Td className="max-w-[16rem] truncate font-medium">{f.funcao}</Td>
                      {Object.entries(f.valores).map(([k, v]) => (
                        <Td key={k} align="right" className={isNum(v) && v > 0 ? "font-semibold" : "text-muted-foreground"}>
                          {isNum(v) ? (v === 0 ? "–" : qtd(v)) : "—"}
                        </Td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel titulo="Rateio de manutenção por setor" bodyClassName="p-0">
            <div className="max-h-[52vh] overflow-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <Th>Setor</Th>
                    <Th align="right">Total</Th>
                    <Th align="right">% do total</Th>
                    <Th align="right">Manutenção do setor</Th>
                  </tr>
                </thead>
                <tbody>
                  {guiaCdc.manutencao.map((m, i) => (
                    <tr key={`${m.setor}-${i}`} className="odd:bg-secondary/30">
                      <Td className="font-medium">{m.setor}</Td>
                      <Td align="right">{money(m.total)}</Td>
                      <Td align="right">{pct(m.percentual, 2)}</Td>
                      <Td align="right" className="font-semibold">
                        {money(m.manutencaoSetor)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      ) : null}
    </>
  );
}

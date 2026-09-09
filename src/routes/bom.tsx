import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { insumos, parametros, produtos } from "@/data";
import { isNum, money, moneyPreciso, qtd } from "@/lib/format";
import { custoMPOriginal, totalMP } from "@/lib/pricing";
import { usePrototype } from "@/state/prototype";
import { DemoTag, EmptyNote, KPI, PageHeader, Panel, RealTag, Td, Th } from "@/components/ui-kit";

type Search = { produto?: string | undefined };

export const Route = createFileRoute("/bom")({
  validateSearch: (search: Record<string, unknown>): Search =>
    typeof search["produto"] === "string" ? { produto: search["produto"] } : {},
  head: () => ({
    meta: [
      { title: "Estruturas / BOM — Protótipo de Precificação" },
      {
        name: "description",
        content:
          "Estrutura de materiais (BOM) de cada produto de concreto, com quantidade, unidade e custo unitário reais dos insumos.",
      },
      { property: "og:title", content: "Estruturas / BOM — Protótipo de Precificação" },
      {
        property: "og:description",
        content: "Composição de matéria-prima por produto, editável no protótipo.",
      },
    ],
  }),
  component: Bom,
});

function Bom() {
  const { produto } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { itensBom, adicionarItemBom, removerItemAdicionado } = usePrototype();

  const selecionado = produto && produtos.some((p) => p.full === produto) ? produto : parametros.produtoExemplo;
  const itens = itensBom(selecionado);
  const adicionados = itens.filter((i) => i.demonstrativo);
  const totalAtual = totalMP(itens);
  const original = custoMPOriginal(selecionado);

  const [modal, setModal] = useState(false);
  const [insumoSel, setInsumoSel] = useState(insumos[0]?.full ?? "");
  const [quantidade, setQuantidade] = useState("1");
  const [unidade, setUnidade] = useState("KG");

  const insumoAtual = useMemo(() => insumos.find((i) => i.full === insumoSel) ?? null, [insumoSel]);

  function confirmar() {
    if (!insumoAtual) return;
    const q = Number(quantidade.replace(",", "."));
    const cu = isNum(insumoAtual.custoUnitario) ? insumoAtual.custoUnitario : null;
    adicionarItemBom(selecionado, {
      item: insumoAtual.full,
      tipo: "Insumo",
      quantidade: Number.isFinite(q) ? q : null,
      unidade,
      custoUnitario: cu,
      custoTotal: cu !== null && Number.isFinite(q) ? cu * q : null,
      demonstrativo: true,
    });
    setModal(false);
    setQuantidade("1");
  }

  return (
    <>
      <PageHeader
        titulo="Estruturas / BOM"
        aba="Custo MP por Produto"
        descricao="A composição de matéria-prima deixa de ser um bloco de células e passa a ser um cadastro versionado por produto. Alterações feitas aqui recalculam o preço na hora e ficam registradas na auditoria."
        acoes={
          <select
            value={selecionado}
            onChange={(e) => navigate({ search: { produto: e.target.value } })}
            className="h-9 max-w-[26rem] rounded-sm border border-input bg-background px-2 text-sm outline-none focus:border-ring"
          >
            {produtos.map((p) => (
              <option key={p.full} value={p.full}>
                {p.full}
              </option>
            ))}
          </select>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPI rotulo="Componentes" valor={qtd(itens.length)} detalhe="Linhas de estrutura" />
        <KPI rotulo="Custo de matéria-prima" valor={money(totalAtual)} detalhe="Soma dos componentes" destaque />
        <KPI
          rotulo="Custo MP na planilha"
          valor={original === null ? "—" : money(original)}
          detalhe="Valor de referência original"
        />
        <KPI
          rotulo="Itens incluídos na sessão"
          valor={qtd(adicionados.length)}
          detalhe="Somente nesta demonstração"
        />
      </div>

      <Panel
        className="mt-4"
        titulo="Composição do produto"
        subtitulo={selecionado}
        acoes={
          <>
            <RealTag />
            <button
              type="button"
              onClick={() => setModal(true)}
              className="inline-flex items-center gap-1.5 rounded-sm bg-green px-3 py-1.5 text-xs font-semibold text-green-foreground hover:opacity-90"
            >
              <Plus className="size-3.5" /> Adicionar componente
            </button>
          </>
        }
        bodyClassName="p-0"
      >
        {itens.length === 0 ? (
          <div className="p-4">
            <EmptyNote>
              Este produto não possui estrutura cadastrada na planilha. Na planilha atual, isso passa
              despercebido; no sistema, ele aparece como problema crítico em Validações.
            </EmptyNote>
          </div>
        ) : (
          <div className="max-h-[52vh] overflow-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Componente</Th>
                  <Th>Tipo</Th>
                  <Th align="right">Quantidade</Th>
                  <Th>Unidade</Th>
                  <Th align="right">Custo unitário</Th>
                  <Th align="right">Custo total</Th>
                  <Th align="center">Origem</Th>
                </tr>
              </thead>
              <tbody>
                {itens.map((l, i) => (
                  <tr key={`${l.item}-${i}`} className="odd:bg-secondary/30">
                    <Td className="max-w-[24rem] truncate">{l.item}</Td>
                    <Td className="text-xs">{l.tipo}</Td>
                    <Td align="right">{qtd(l.quantidade)}</Td>
                    <Td>{l.unidade ?? "—"}</Td>
                    <Td align="right">{moneyPreciso(l.custoUnitario)}</Td>
                    <Td align="right" className="font-semibold">
                      {money(l.custoTotal)}
                    </Td>
                    <Td align="center">
                      {l.demonstrativo ? (
                        <span className="inline-flex items-center gap-2">
                          <DemoTag>Sessão</DemoTag>
                          <button
                            type="button"
                            aria-label="Remover componente"
                            onClick={() => removerItemAdicionado(selecionado, l.item)}
                            className="text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                          Planilha
                        </span>
                      )}
                    </Td>
                  </tr>
                ))}
                <tr className="bg-table-total font-bold">
                  <Td>Total de matéria-prima</Td>
                  <Td />
                  <Td />
                  <Td />
                  <Td />
                  <Td align="right">{money(totalAtual)}</Td>
                  <Td />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-deep/60 p-4">
          <div className="w-full max-w-lg rounded-md border border-border bg-card p-5 shadow-panel">
            <h3 className="text-base font-bold tracking-tight text-foreground uppercase">
              Adicionar componente
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Insumos reais cadastrados na planilha. A inclusão vale apenas para esta sessão de
              demonstração.
            </p>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="font-semibold">Insumo</span>
                <select
                  value={insumoSel}
                  onChange={(e) => setInsumoSel(e.target.value)}
                  className="mt-1 h-9 w-full rounded-sm border border-input bg-background px-2 text-sm outline-none focus:border-ring"
                >
                  {insumos.map((i) => (
                    <option key={i.full} value={i.full}>
                      {i.full}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="font-semibold">Quantidade</span>
                  <input
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                    inputMode="decimal"
                    className="mt-1 h-9 w-full rounded-sm border border-input bg-background px-2 text-sm outline-none focus:border-ring"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-semibold">Unidade</span>
                  <select
                    value={unidade}
                    onChange={(e) => setUnidade(e.target.value)}
                    className="mt-1 h-9 w-full rounded-sm border border-input bg-background px-2 text-sm outline-none focus:border-ring"
                  >
                    {["KG", "UN", "M", "M2", "M3", "LT", "PC"].map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="rounded-sm border border-border bg-muted/60 p-2 text-xs text-muted-foreground">
                Custo unitário do insumo:{" "}
                <strong className="text-foreground">{moneyPreciso(insumoAtual?.custoUnitario)}</strong>
              </p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModal(false)}
                className="rounded-sm border border-input px-3 py-2 text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmar}
                className="rounded-sm bg-green px-3 py-2 text-sm font-semibold text-green-foreground"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

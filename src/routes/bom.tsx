import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { parametros, produtos } from "@/data";
import { isNum, money, moneyPreciso, qtd } from "@/lib/format";
import { custoMPOriginal, totalMP } from "@/lib/pricing";
import { descricaoProblema } from "@/lib/correcoes";
import { usePrototype } from "@/state/prototype";
import { EditLockBanner } from "@/components/EditLockBanner";
import { DemoTag, EmptyNote, KPI, PageHeader, Panel, RealTag, Td, Th } from "@/components/ui-kit";

type Search = { produto?: string | undefined };

export const Route = createFileRoute("/bom")({
  validateSearch: (search: Record<string, unknown>): Search =>
    typeof search["produto"] === "string" ? { produto: search["produto"] } : {},
  head: () => ({
    meta: [
      { title: "Estruturas / BOM — Sistema de Precificação" },
      {
        name: "description",
        content:
          "Estrutura de materiais (BOM) de cada produto de concreto, com quantidade, unidade e custo unitário reais dos insumos.",
      },
      { property: "og:title", content: "Estruturas / BOM — Sistema de Precificação" },
      {
        property: "og:description",
        content: "Composição de matéria-prima por produto, editável no protótipo.",
      },
    ],
  }),
  component: Bom,
});

function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function SearchSelect({
  valor,
  opcoes,
  onChange,
  placeholder,
  className,
}: {
  valor: string;
  opcoes: string[];
  onChange: (valor: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [destaque, setDestaque] = useState(0);
  const raiz = useRef<HTMLDivElement>(null);

  const filtradas = useMemo(() => {
    const termo = normalizar(busca.trim());
    if (!termo) return opcoes;
    return opcoes.filter((o) => normalizar(o).includes(termo));
  }, [opcoes, busca]);

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  function escolher(opcao: string) {
    onChange(opcao);
    setBusca("");
    setAberto(false);
  }

  return (
    <div ref={raiz} className={`relative ${className ?? ""}`}>
      <div
        className="flex h-9 cursor-pointer items-center gap-2 rounded-sm border border-input bg-background px-2 text-sm focus-within:border-ring"
        onClick={() => {
          setAberto(true);
          raiz.current?.querySelector("input")?.focus();
        }}
      >
        <Search className="size-3.5 shrink-0 text-muted-foreground" />
        {aberto ? (
          <input
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setDestaque(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setDestaque((d) => Math.min(d + 1, filtradas.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setDestaque((d) => Math.max(d - 1, 0));
              } else if (e.key === "Enter" && filtradas[destaque]) {
                e.preventDefault();
                escolher(filtradas[destaque]);
              } else if (e.key === "Escape") {
                setAberto(false);
                setBusca("");
              }
            }}
            placeholder={placeholder ?? "Digite para buscar…"}
            className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
          />
        ) : (
          <span className="w-full truncate">{valor || (placeholder ?? "Selecione…")}</span>
        )}
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </div>
      {aberto ? (
        <ul className="absolute z-40 mt-1 max-h-64 w-full overflow-auto rounded-sm border border-border bg-popover py-1 shadow-panel">
          {filtradas.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted-foreground">Nenhum resultado para “{busca}”.</li>
          ) : (
            filtradas.slice(0, 100).map((opcao, i) => (
              <li key={opcao}>
                <button
                  type="button"
                  onMouseEnter={() => setDestaque(i)}
                  onClick={() => escolher(opcao)}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm ${
                    i === destaque ? "bg-secondary" : ""
                  }`}
                >
                  <Check className={`size-3.5 shrink-0 ${opcao === valor ? "text-green" : "opacity-0"}`} />
                  <span className="truncate">{opcao}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

function Bom() {
  const { produto } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { itensBom, adicionarItemBom, salvarItemBom, removerItemBom, listaInsumos, autenticado } = usePrototype();

  const selecionado = produto && produtos.some((p) => p.full === produto) ? produto : parametros.produtoExemplo;
  const itens = itensBom(selecionado);
  const adicionados = itens.filter((i) => i.demonstrativo);
  const totalAtual = totalMP(itens);
  const original = custoMPOriginal(selecionado);

  const [modal, setModal] = useState(false);
  const [insumoSel, setInsumoSel] = useState(listaInsumos[0]?.full ?? "");
  const [quantidade, setQuantidade] = useState("1");
  const [unidade, setUnidade] = useState("KG");
  const [indiceEditando, setIndiceEditando] = useState<number | null>(null);

  const insumoAtual = useMemo(() => listaInsumos.find((i) => i.full === insumoSel) ?? null, [insumoSel, listaInsumos]);

  function confirmar() {
    if (!insumoAtual) return;
    const q = Number(quantidade.replace(",", "."));
    const cu = isNum(insumoAtual.custoUnitario) ? insumoAtual.custoUnitario : null;
    const item = {
      item: insumoAtual.full,
      tipo: "Insumo",
      quantidade: Number.isFinite(q) ? q : null,
      unidade,
      custoUnitario: cu,
      custoTotal: cu !== null && Number.isFinite(q) ? cu * q : null,
    };
    if (indiceEditando === null) adicionarItemBom(selecionado, item);
    else salvarItemBom(selecionado, indiceEditando, item);
    setModal(false);
    setIndiceEditando(null);
    setQuantidade("1");
  }

  return (
    <>
      <PageHeader
        titulo="Estruturas / BOM"
        aba="Custo MP por Produto"
        descricao="A composição de matéria-prima deixa de ser um bloco de células e passa a ser um cadastro versionado por produto. Alterações feitas aqui recalculam o preço na hora e ficam registradas na auditoria."
        acoes={
          <SearchSelect
            valor={selecionado}
            opcoes={produtos.map((p) => p.full)}
            onChange={(v) => navigate({ search: { produto: v } })}
            placeholder="Buscar produto por nome ou código…"
            className="w-[26rem] max-w-full"
          />
        }
      />
      <EditLockBanner />

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
              disabled={!autenticado}
              title={autenticado ? "Adicionar componente" : "Entre para editar"}
              onClick={() => { setIndiceEditando(null); setModal(true); }}
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
                   <Th align="center">Ações</Th>
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
                      {l.problemas.length ? (
                        <span
                          className="ml-1 text-destructive"
                          title={l.problemas.map(descricaoProblema).join(" ")}
                        >
                          !
                        </span>
                      ) : null}
                    </Td>
                    <Td align="center">
                       <span className="inline-flex items-center gap-1">
                         <button type="button" disabled={!autenticado} aria-label="Editar componente" title="Editar componente" onClick={() => {
                           setIndiceEditando(i); setInsumoSel(l.item); setQuantidade(String(l.quantidade ?? "")); setUnidade(l.unidade ?? "KG"); setModal(true);
                         }} className="rounded-sm p-1 text-primary disabled:opacity-30"><Pencil className="size-3.5" /></button>
                         <button type="button" disabled={!autenticado} aria-label="Remover componente" title="Remover componente" onClick={() => removerItemBom(selecionado, i)} className="rounded-sm p-1 text-destructive disabled:opacity-30"><Trash2 className="size-3.5" /></button>
                       </span>
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
              {indiceEditando === null ? "Adicionar componente" : "Editar componente"}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
               Selecione o insumo e informe o consumo por peça. A alteração fica compartilhada.
            </p>
            <div className="mt-4 space-y-3">
              <div className="block text-sm">
                <span className="font-semibold">Insumo</span>
                <SearchSelect
                  valor={insumoSel}
                  opcoes={listaInsumos.map((i) => i.full)}
                  onChange={setInsumoSel}
                  placeholder="Buscar insumo…"
                  className="mt-1"
                />
              </div>
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
                 onClick={() => { setModal(false); setIndiceEditando(null); }}
                className="rounded-sm border border-input px-3 py-2 text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmar}
                className="rounded-sm bg-green px-3 py-2 text-sm font-semibold text-green-foreground"
              >
                 {indiceEditando === null ? "Adicionar" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

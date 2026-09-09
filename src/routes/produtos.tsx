import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { categoriaDoProduto, produtos } from "@/data";
import { money, qtd } from "@/lib/format";
import { bomDoProduto, cenarioSugerido, custoProducao, precoRapido, totalMP } from "@/lib/pricing";
import { PageHeader, Panel, Td, Th } from "@/components/ui-kit";

export const Route = createFileRoute("/produtos")({
  head: () => ({
    meta: [
      { title: "Produtos — Protótipo de Precificação" },
      {
        name: "description",
        content:
          "Catálogo com os 246 produtos reais da ferramenta de precificação, com custo de matéria-prima, custo de produção e preço calculado.",
      },
      { property: "og:title", content: "Produtos — Protótipo de Precificação" },
      {
        property: "og:description",
        content: "Catálogo de produtos reais com custo e preço calculados pelo sistema.",
      },
    ],
  }),
  component: Produtos,
});

const PAGINA = 25;

function Produtos() {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("TODAS");
  const [pagina, setPagina] = useState(0);

  const linhas = useMemo(
    () =>
      produtos.map((p) => {
        const itens = bomDoProduto(p.full);
        return {
          ...p,
          categoria: categoriaDoProduto(p.full),
          componentes: itens.length,
          custoMP: itens.length ? totalMP(itens) : null,
          producao: custoProducao(p.full),
          cenario: cenarioSugerido(p.full),
          preco: precoRapido(p.full),
        };
      }),
    [],
  );

  const categorias = useMemo(
    () => ["TODAS", ...Array.from(new Set(linhas.map((l) => l.categoria))).sort()],
    [linhas],
  );

  const filtradas = linhas.filter(
    (l) =>
      (categoria === "TODAS" || l.categoria === categoria) &&
      l.full.toLowerCase().includes(busca.toLowerCase()),
  );
  const total = filtradas.length;
  const page = filtradas.slice(pagina * PAGINA, pagina * PAGINA + PAGINA);
  const paginas = Math.max(1, Math.ceil(total / PAGINA));

  return (
    <>
      <PageHeader
        titulo="Produtos"
        aba="Lista de Produtos"
        descricao="Catálogo único de produtos. No sistema, cada produto passa a ter estrutura, roteiro de produção e histórico próprios — hoje isso está espalhado por várias abas."
      />

      <Panel
        titulo={`${qtd(total)} produtos`}
        subtitulo="Custo e preço calculados no momento da consulta"
        acoes={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-2.5 left-2 size-4 text-muted-foreground" />
              <input
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                  setPagina(0);
                }}
                placeholder="Buscar código ou descrição"
                className="h-9 w-56 rounded-sm border border-input bg-background pr-2 pl-8 text-sm outline-none focus:border-ring"
              />
            </div>
            <select
              value={categoria}
              onChange={(e) => {
                setCategoria(e.target.value);
                setPagina(0);
              }}
              className="h-9 rounded-sm border border-input bg-background px-2 text-sm outline-none focus:border-ring"
            >
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        }
        bodyClassName="p-0"
      >
        <div className="max-h-[62vh] overflow-auto">
          <table className="w-full">
            <thead>
              <tr>
                <Th>Código</Th>
                <Th>Descrição</Th>
                <Th>Família</Th>
                <Th align="right">Componentes</Th>
                <Th align="right">Custo MP</Th>
                <Th align="right">Custo produção</Th>
                <Th align="right">Preço ({"cenário sugerido"})</Th>
                <Th align="center">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {page.map((l) => (
                <tr key={l.full} className="odd:bg-secondary/30">
                  <Td className="font-semibold">{l.codigo}</Td>
                  <Td className="max-w-[22rem] truncate">{l.descricao}</Td>
                  <Td className="text-xs">{l.categoria}</Td>
                  <Td align="right">{l.componentes ? qtd(l.componentes) : "—"}</Td>
                  <Td align="right">{l.custoMP === null ? "—" : money(l.custoMP)}</Td>
                  <Td align="right">{l.producao === null ? "—" : money(l.producao)}</Td>
                  <Td align="right" className="font-semibold">
                    {l.preco === null ? "—" : money(l.preco)}
                  </Td>
                  <Td align="center">
                    <div className="flex justify-center gap-2 text-xs font-semibold">
                      <Link
                        to="/bom"
                        search={{ produto: l.full }}
                        className="text-primary hover:underline"
                      >
                        Estrutura
                      </Link>
                      <Link
                        to="/precificacao"
                        search={{ produto: l.full }}
                        className="text-primary hover:underline"
                      >
                        Precificar
                      </Link>
                    </div>
                  </Td>
                </tr>
              ))}
              {page.length === 0 ? (
                <tr>
                  <Td className="text-muted-foreground">Nenhum produto encontrado.</Td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <span>
            Página {pagina + 1} de {paginas}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pagina === 0}
              onClick={() => setPagina((p) => p - 1)}
              className="rounded-sm border border-input px-2.5 py-1 font-semibold disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={pagina + 1 >= paginas}
              onClick={() => setPagina((p) => p + 1)}
              className="rounded-sm border border-input px-2.5 py-1 font-semibold disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      </Panel>
    </>
  );
}

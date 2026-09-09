import { baixarExcel, type Celula, type DefinicaoAba, type TipoLinha } from "@/lib/planilha-excel";

export type LinhaMemoriaExport = {
  rotulo: string;
  base: string;
  valor: number | null;
  formato: "moeda" | "percentual";
  tipo?: TipoLinha;
};

export type ItemMpExport = {
  item: string;
  quantidade: number | null;
  unidade: string | null;
  custoUnitario: number | null;
  custoTotal: number | null;
};

/** Exporta a memória de cálculo do preço e a composição de matéria-prima. */
export function exportarPrecificacaoExcel(params: {
  produto: string;
  cenario: string;
  linhas: LinhaMemoriaExport[];
  itens: ItemMpExport[];
  nomeArquivo?: string;
}) {
  const memoria: DefinicaoAba = {
    nome: "Precificação",
    cabecalho: ["Etapa", "Base de cálculo", "Valor (R$)", "Percentual"],
    formatos: ["texto", "texto", "moeda", "percentual"],
    largurasMinimas: [34, 52, 18, 14],
    linhas: [
      { celulas: ["Produto", params.produto, null, null] as Celula[], tipo: "grupo" },
      { celulas: ["Cenário tributário", params.cenario, null, null] as Celula[], tipo: "grupo" },
      ...params.linhas.map((l) => ({
        celulas: [
          l.rotulo,
          l.base,
          l.formato === "moeda" ? l.valor : null,
          l.formato === "percentual" ? l.valor : null,
        ] as Celula[],
        tipo: l.tipo ?? "dado",
      })),
    ],
  };

  const composicao: DefinicaoAba = {
    nome: "Matéria-prima",
    cabecalho: ["Componente", "Quantidade", "Unidade", "Custo unitário (R$)", "Custo total (R$)"],
    formatos: ["texto", "quantidade", "texto", "moeda", "moeda"],
    largurasMinimas: [46, 14, 10, 20, 18],
    linhas: [
      ...params.itens.map((i) => ({
        celulas: [i.item, i.quantidade, i.unidade ?? "—", i.custoUnitario, i.custoTotal] as Celula[],
      })),
      {
        celulas: [
          "Total da matéria-prima",
          null,
          null,
          null,
          params.itens.reduce((s, i) => s + (i.custoTotal ?? 0), 0),
        ] as Celula[],
        tipo: "total" as TipoLinha,
      },
    ],
  };

  baixarExcel(params.nomeArquivo ?? "precificacao.xlsx", [memoria, composicao]);
}

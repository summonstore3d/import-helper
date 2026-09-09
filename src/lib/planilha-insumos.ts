import type { Insumo } from "@/data";
import type { InsumoEntrada } from "@/state/prototype";
import {
  baixarExcel,
  lerExcel,
  mapearColunas,
  numeroCelula,
  textoCelula,
  type Celula,
  type DefinicaoAba,
} from "@/lib/planilha-excel";

export const ABA_INSUMOS = "Insumos";

export type LinhaInsumoExport = Insumo & { unidade: string };

/** Exporta o cadastro de insumos no modelo aceito pela importação. */
export function exportarInsumosExcel(linhas: LinhaInsumoExport[], nomeArquivo = "insumos.xlsx") {
  const aba: DefinicaoAba = {
    nome: ABA_INSUMOS,
    cabecalho: ["Código", "Descrição", "Unidade", "Custo unitário (R$)"],
    formatos: ["texto", "texto", "texto", "moeda"],
    largurasMinimas: [14, 46, 12, 20],
    linhas: linhas.map((l) => ({
      celulas: [l.codigo, l.descricao, l.unidade, l.custoUnitario] as Celula[],
    })),
  };
  baixarExcel(nomeArquivo, [aba]);
}

export type ResultadoInsumos = {
  entradas: InsumoEntrada[];
  problemas: string[];
};

/** Lê a planilha de insumos, validando cabeçalho e valores. */
export async function importarInsumosExcel(arquivo: File): Promise<ResultadoInsumos> {
  const matriz = await lerExcel(arquivo, ABA_INSUMOS);
  if (matriz.length < 2) throw new Error("A planilha está vazia ou não tem linhas de dados.");

  const colunas = mapearColunas(matriz[0] ?? [], {
    codigo: ["Código", "Codigo"],
    descricao: ["Descrição", "Descricao"],
    custoUnitario: ["Custo unitário (R$)", "Custo unitário", "Custo unitario"],
  });

  const entradas: InsumoEntrada[] = [];
  const problemas: string[] = [];
  const vistos = new Set<string>();

  for (let i = 1; i < matriz.length; i += 1) {
    const linha = matriz[i] ?? [];
    const numeroLinha = i + 1;
    const codigo = textoCelula(linha[colunas["codigo"] ?? 0]);
    const descricao = textoCelula(linha[colunas["descricao"] ?? 1]);
    const bruto = linha[colunas["custoUnitario"] ?? 2];
    if (!codigo && !descricao && (bruto === null || bruto === "")) continue;

    if (!codigo) {
      problemas.push(`Linha ${numeroLinha}: código em branco.`);
      continue;
    }
    if (!descricao) {
      problemas.push(`Linha ${numeroLinha} (${codigo}): descrição em branco.`);
      continue;
    }
    if (vistos.has(codigo.toUpperCase())) {
      problemas.push(`Linha ${numeroLinha}: código ${codigo} repetido na planilha.`);
      continue;
    }

    let custo: number | null = null;
    const textoCusto = textoCelula(bruto);
    if (textoCusto !== "") {
      custo = numeroCelula(bruto);
      if (custo === null) {
        problemas.push(`Linha ${numeroLinha} (${codigo}): custo "${textoCusto}" não é um número.`);
        continue;
      }
      if (custo < 0) {
        problemas.push(`Linha ${numeroLinha} (${codigo}): custo negativo não é aceito.`);
        continue;
      }
    }

    vistos.add(codigo.toUpperCase());
    entradas.push({ codigo, descricao, custoUnitario: custo });
  }

  if (!entradas.length) {
    throw new Error(
      problemas.length
        ? `Nenhuma linha válida encontrada. ${problemas[0]}`
        : "Nenhuma linha de insumo encontrada na planilha.",
    );
  }

  return { entradas, problemas };
}

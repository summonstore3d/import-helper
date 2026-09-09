import type { Despesas } from "@/data";
import {
  baixarExcel,
  lerExcel,
  mapearColunas,
  numeroCelula,
  textoCelula,
  type Celula,
  type DefinicaoAba,
  type FormatoColuna,
  type TipoLinha,
} from "@/lib/planilha-excel";

/**
 * Exportação/importação do demonstrativo mensal em formato de planilha (CSV
 * separado por ponto e vírgula, com BOM UTF-8 — abre direto no Excel).
 *
 * Layout do arquivo:
 *   Tipo;Conta;<mês 1>;<mês 2>;...
 *   conta;MATERIA PRIMA;611471,30;897467,66;...
 *   rodape;Faturamento por Mês:;1538000,00;...
 *
 * Células vazias voltam como valor ausente (null), preservando os meses ainda
 * não fechados.
 */

const SEP = ";";

function numeroParaCelula(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "";
  return v.toFixed(2).replace(".", ",");
}

export function celulaParaNumero(texto: string): number | null {
  const limpo = texto
    .replace(/\s/g, "")
    .replace(/R\$/gi, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[()]/g, (m) => (m === "(" ? "-" : ""));
  if (!limpo) return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

function escapar(texto: string): string {
  return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function despesasParaCsv(fonte: Despesas): string {
  const linhas: string[] = [];
  linhas.push(["Tipo", "Conta", ...fonte.meses].map(escapar).join(SEP));
  fonte.linhas.forEach((l) => {
    linhas.push(
      [l.tipo, l.nome, ...l.valores.map((v) => numeroParaCelula(v.valor))]
        .map(escapar)
        .join(SEP),
    );
  });
  fonte.rodape.forEach((r) => {
    linhas.push(["rodape", r.nome, ...r.valores.map(numeroParaCelula)].map(escapar).join(SEP));
  });
  return `\uFEFF${linhas.join("\r\n")}\r\n`;
}

function separarLinhaCsv(linha: string, sep: string): string[] {
  const campos: string[] = [];
  let atual = "";
  let aspas = false;
  for (let i = 0; i < linha.length; i += 1) {
    const c = linha[i];
    if (aspas) {
      if (c === '"' && linha[i + 1] === '"') {
        atual += '"';
        i += 1;
      } else if (c === '"') aspas = false;
      else atual += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) {
      campos.push(atual);
      atual = "";
    } else atual += c;
  }
  campos.push(atual);
  return campos.map((c) => c.trim());
}

export type ResultadoImportacao = {
  despesas: Despesas;
  linhasAtualizadas: number;
  linhasIgnoradas: string[];
};

/** Lê o CSV exportado e devolve o demonstrativo com os valores atualizados. */
export function csvParaDespesas(texto: string, base: Despesas): ResultadoImportacao {
  const conteudo = texto.replace(/^\uFEFF/, "");
  const linhas = conteudo.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (linhas.length < 2) throw new Error("A planilha está vazia ou fora do padrão exportado.");

  const primeira = linhas[0] ?? "";
  const sep = primeira.split(";").length >= primeira.split(",").length ? ";" : ",";
  const cabecalho = separarLinhaCsv(primeira, sep);
  if (cabecalho.length < 3 || (cabecalho[1] ?? "").toLowerCase() !== "conta") {
    throw new Error(
      'Cabeçalho inesperado. Use o arquivo exportado por esta tela (colunas "Tipo", "Conta" e os meses).',
    );
  }
  const totalMeses = base.meses.length;

  const ignoradas: string[] = [];
  let atualizadas = 0;

  const chave = (tipo: string, nome: string) => `${tipo}::${nome.trim().toLowerCase()}`;

  const valoresPorChave = new Map<string, (number | null)[]>();
  for (let i = 1; i < linhas.length; i += 1) {
    const campos = separarLinhaCsv(linhas[i] ?? "", sep);
    const tipo = (campos[0] ?? "").toLowerCase();
    const nome = campos[1] ?? "";
    if (!nome) continue;
    const valores: (number | null)[] = [];
    for (let m = 0; m < totalMeses; m += 1) valores.push(celulaParaNumero(campos[2 + m] ?? ""));
    valoresPorChave.set(chave(tipo === "rodape" ? "rodape" : tipo, nome), valores);
  }

  const despesasAtualizadas: Despesas = {
    ...base,
    linhas: base.linhas.map((l) => {
      const valores = valoresPorChave.get(chave(l.tipo, l.nome));
      if (!valores) {
        ignoradas.push(l.nome);
        return l;
      }
      atualizadas += 1;
      return {
        ...l,
        valores: l.valores.map((v, i) => ({ ...v, valor: valores[i] ?? null })),
      };
    }),
    rodape: base.rodape.map((r) => {
      const valores = valoresPorChave.get(chave("rodape", r.nome));
      if (!valores) {
        ignoradas.push(r.nome);
        return r;
      }
      atualizadas += 1;
      return { ...r, valores: r.valores.map((_, i) => valores[i] ?? null) };
    }),
  };

  if (atualizadas === 0) {
    throw new Error("Nenhuma conta da planilha corresponde ao demonstrativo atual.");
  }

  return { despesas: despesasAtualizadas, linhasAtualizadas: atualizadas, linhasIgnoradas: ignoradas };
}

export function baixarArquivo(nome: string, conteudo: string, tipo = "text/csv;charset=utf-8") {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/* Versão Excel (.xlsx) do mesmo demonstrativo                         */
/* ------------------------------------------------------------------ */

export const ABA_DESPESAS = "Demonstrativo";

const CABECALHO_FIXO = ["Tipo", "Conta"];

/** Exporta o demonstrativo mensal em Excel, com uma coluna por mês. */
export function exportarDespesasExcel(fonte: Despesas, nomeArquivo = "demonstrativo-mensal.xlsx") {
  const formatos: FormatoColuna[] = [
    "texto",
    "texto",
    ...fonte.meses.map((): FormatoColuna => "moeda"),
  ];
  const aba: DefinicaoAba = {
    nome: ABA_DESPESAS,
    cabecalho: [...CABECALHO_FIXO, ...fonte.meses],
    formatos,
    largurasMinimas: [12, 40, ...fonte.meses.map(() => 16)],
    linhas: [
      ...fonte.linhas.map((l) => ({
        celulas: [l.tipo, l.nome, ...l.valores.map((v) => v.valor)] as Celula[],
        tipo: (l.tipo === "grupo" ? "grupo" : "dado") as TipoLinha,
      })),
      ...fonte.rodape.map((r) => ({
        celulas: ["rodape", r.nome, ...r.valores] as Celula[],
        tipo: "total" as TipoLinha,
      })),
    ],
  };
  baixarExcel(nomeArquivo, [aba]);
}

/** Lê o Excel exportado e devolve o demonstrativo com os valores atualizados. */
export async function importarDespesasExcel(
  arquivo: File,
  base: Despesas,
): Promise<ResultadoImportacao> {
  const matriz = await lerExcel(arquivo, ABA_DESPESAS);
  if (matriz.length < 2) throw new Error("A planilha está vazia ou não tem linhas de dados.");

  const cabecalho = matriz[0] ?? [];
  const colunas = mapearColunas(cabecalho, { tipo: ["Tipo"], conta: ["Conta"] });
  const iTipo = colunas["tipo"] ?? 0;
  const iConta = colunas["conta"] ?? 1;
  const primeiroMes = Math.max(iTipo, iConta) + 1;
  const mesesArquivo = cabecalho.slice(primeiroMes).map((c) => textoCelula(c)).filter(Boolean);

  if (mesesArquivo.length < base.meses.length) {
    throw new Error(
      `Planilha fora do padrão: são esperadas ${base.meses.length} colunas de meses (${base.meses[0]} a ${
        base.meses[base.meses.length - 1]
      }) e o arquivo trouxe ${mesesArquivo.length}.`,
    );
  }

  const chave = (tipo: string, nome: string) => `${tipo}::${nome.trim().toLowerCase()}`;
  const valoresPorChave = new Map<string, (number | null)[]>();
  const invalidos: string[] = [];

  for (let i = 1; i < matriz.length; i += 1) {
    const linha = matriz[i] ?? [];
    const nome = textoCelula(linha[iConta]);
    if (!nome) continue;
    const tipo = textoCelula(linha[iTipo]).toLowerCase() || "conta";
    const valores: (number | null)[] = [];
    for (let m = 0; m < base.meses.length; m += 1) {
      const celula = linha[primeiroMes + m];
      const texto = textoCelula(celula);
      const numero = numeroCelula(celula);
      if (texto !== "" && numero === null) {
        invalidos.push(`"${nome}" — ${base.meses[m] ?? `mês ${m + 1}`}: "${texto}" não é número`);
      }
      valores.push(numero);
    }
    valoresPorChave.set(chave(tipo, nome), valores);
  }

  if (invalidos.length) {
    throw new Error(
      `A planilha tem valores inválidos: ${invalidos.slice(0, 3).join("; ")}${
        invalidos.length > 3 ? ` e mais ${invalidos.length - 3}` : ""
      }. Corrija as células e importe novamente.`,
    );
  }

  const ignoradas: string[] = [];
  let atualizadas = 0;

  const despesas: Despesas = {
    ...base,
    linhas: base.linhas.map((l) => {
      const valores = valoresPorChave.get(chave(l.tipo, l.nome));
      if (!valores) {
        ignoradas.push(l.nome);
        return l;
      }
      atualizadas += 1;
      return { ...l, valores: l.valores.map((v, i) => ({ ...v, valor: valores[i] ?? null })) };
    }),
    rodape: base.rodape.map((r) => {
      const valores = valoresPorChave.get(chave("rodape", r.nome));
      if (!valores) {
        ignoradas.push(r.nome);
        return r;
      }
      atualizadas += 1;
      return { ...r, valores: r.valores.map((_, i) => valores[i] ?? null) };
    }),
  };

  if (atualizadas === 0) {
    throw new Error("Nenhuma conta da planilha corresponde ao demonstrativo atual.");
  }

  return { despesas, linhasAtualizadas: atualizadas, linhasIgnoradas: ignoradas };
}

import * as XLSX from "xlsx-js-style";

/**
 * Geração e leitura de planilhas Excel (.xlsx) padronizadas com a identidade
 * visual D'AGOSTINI, reproduzindo o visual das tabelas do sistema:
 *   - cabeçalho azul marinho (#162B4D) com texto branco em negrito;
 *   - linhas de grupo em cinza-azulado claro;
 *   - linhas de total em verde suave (#E8F5E9) com borda #10B981;
 *   - zebra discreta nas linhas de dados;
 *   - formatos nativos de moeda, percentual e quantidade;
 *   - largura de coluna calculada pelo conteúdo, com folga.
 */

export type Celula = string | number | null;

export const FORMATO_MOEDA = 'R$ #,##0.00';
export const FORMATO_PERCENTUAL = "0.00%";
export const FORMATO_QUANTIDADE = "#,##0";

export type FormatoColuna = "texto" | "moeda" | "percentual" | "quantidade";
export type TipoLinha = "dado" | "grupo" | "total";

const NAVY = "FF162B4D";
const VERDE_SUAVE = "FFE8F5E9";
const VERDE_BORDA = "FF10B981";
const CINZA_GRUPO = "FFEEF2F7";
const ZEBRA = "FFF7F9FC";
const BORDA_SUAVE = "FFD8DEE7";
const TEXTO = "FF0F172A";

export type DefinicaoAba = {
  nome: string;
  /** Títulos das colunas (primeira linha da aba). */
  cabecalho: string[];
  /** Linhas de dados, na mesma ordem das colunas do cabeçalho. */
  linhas: { celulas: Celula[]; tipo?: TipoLinha }[];
  /** Formato de cada coluna, na mesma ordem do cabeçalho. */
  formatos?: FormatoColuna[];
  /** Largura mínima por coluna (caracteres); a final considera o conteúdo. */
  largurasMinimas?: number[];
};

const borda = (cor: string) => ({
  top: { style: "thin", color: { rgb: cor } },
  bottom: { style: "thin", color: { rgb: cor } },
  left: { style: "thin", color: { rgb: cor } },
  right: { style: "thin", color: { rgb: cor } },
});

function estiloCabecalho() {
  return {
    font: { name: "Arial", sz: 11, bold: true, color: { rgb: "FFFFFFFF" } },
    fill: { patternType: "solid", fgColor: { rgb: NAVY } },
    alignment: { vertical: "center", horizontal: "left", wrapText: true },
    border: borda(NAVY),
  };
}

function estiloCorpo(tipo: TipoLinha, zebra: boolean, alinharDireita: boolean) {
  const fundo =
    tipo === "total" ? VERDE_SUAVE : tipo === "grupo" ? CINZA_GRUPO : zebra ? ZEBRA : "FFFFFFFF";
  return {
    font: {
      name: "Arial",
      sz: 10,
      bold: tipo !== "dado",
      color: { rgb: TEXTO },
    },
    fill: { patternType: "solid", fgColor: { rgb: fundo } },
    alignment: {
      vertical: "center",
      horizontal: alinharDireita ? "right" : "left",
      wrapText: false,
    },
    border: borda(tipo === "total" ? VERDE_BORDA : BORDA_SUAVE),
  };
}

function formatoNumero(f: FormatoColuna | undefined): string | undefined {
  if (f === "moeda") return FORMATO_MOEDA;
  if (f === "percentual") return FORMATO_PERCENTUAL;
  if (f === "quantidade") return FORMATO_QUANTIDADE;
  return undefined;
}

/** Largura visual aproximada de uma célula já formatada. */
function larguraTexto(v: Celula, formato: FormatoColuna | undefined): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") {
    if (formato === "moeda") return `R$ ${v.toFixed(2)}`.length + 3;
    if (formato === "percentual") return 8;
    return String(Math.round(v)).length + 4;
  }
  return String(v).length;
}

function montarAba(def: DefinicaoAba): XLSX.WorkSheet {
  const matriz: Celula[][] = [
    def.cabecalho,
    ...def.linhas.map((l) => l.celulas.map((c) => (c === null ? "" : c))),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(matriz);
  const colunas = def.cabecalho.length;

  for (let c = 0; c < colunas; c += 1) {
    const refCab = XLSX.utils.encode_cell({ r: 0, c });
    const cab = sheet[refCab] as XLSX.CellObject | undefined;
    if (cab) cab.s = estiloCabecalho();
  }

  def.linhas.forEach((linha, i) => {
    const r = i + 1;
    const tipo = linha.tipo ?? "dado";
    for (let c = 0; c < colunas; c += 1) {
      const ref = XLSX.utils.encode_cell({ r, c });
      let cell = sheet[ref] as XLSX.CellObject | undefined;
      if (!cell) {
        cell = { t: "s", v: "" };
        sheet[ref] = cell;
      }
      const formato = def.formatos?.[c];
      const numerico = cell.t === "n";
      cell.s = estiloCorpo(tipo, i % 2 === 1, numerico || formato !== "texto");
      const z = formatoNumero(formato);
      if (numerico && z) cell.z = z;
    }
  });

  const ultimaCelula = XLSX.utils.encode_cell({
    r: matriz.length - 1,
    c: Math.max(colunas - 1, 0),
  });
  sheet["!ref"] = `A1:${ultimaCelula}`;

  sheet["!cols"] = Array.from({ length: colunas }, (_, c) => {
    const conteudo = Math.max(
      (def.cabecalho[c] ?? "").length + 2,
      ...def.linhas.map((l) => larguraTexto(l.celulas[c] ?? null, def.formatos?.[c])),
    );
    const minima = def.largurasMinimas?.[c] ?? 10;
    return { wch: Math.min(Math.max(conteudo + 3, minima), 60) };
  });
  sheet["!rows"] = [{ hpt: 22 }];
  sheet["!freeze"] = { xSplit: 0, ySplit: 1 };
  sheet["!autofilter"] = { ref: `A1:${ultimaCelula}` };
  return sheet;
}

/** Gera o arquivo .xlsx e dispara o download no navegador. */
export function baixarExcel(nomeArquivo: string, abas: DefinicaoAba[]) {
  const wb = XLSX.utils.book_new();
  abas.forEach((def) => XLSX.utils.book_append_sheet(wb, montarAba(def), def.nome.slice(0, 31)));
  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Lê a aba informada (ou a primeira) de um .xlsx como matriz de células. */
export async function lerExcel(arquivo: File, nomeAba?: string): Promise<Celula[][]> {
  const buffer = await arquivo.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const nome = nomeAba && wb.SheetNames.includes(nomeAba) ? nomeAba : wb.SheetNames[0];
  if (!nome) throw new Error("O arquivo Excel não contém nenhuma aba.");
  const sheet = wb.Sheets[nome];
  if (!sheet) throw new Error(`Aba "${nome}" não encontrada no arquivo.`);
  const linhas = XLSX.utils.sheet_to_json<Celula[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: false,
  });
  return linhas.map((l) => (Array.isArray(l) ? l : []));
}

export function textoCelula(v: Celula | undefined): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

/** Converte uma célula em número, aceitando também o padrão brasileiro digitado. */
export function numeroCelula(v: Celula | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const bruto = String(v).trim();
  if (!bruto) return null;
  const negativo = /^\(.*\)$/.test(bruto);
  const limpo = bruto
    .replace(/[()]/g, "")
    .replace(/\s/g, "")
    .replace(/r\$/gi, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(limpo);
  if (!Number.isFinite(n)) return null;
  return negativo ? -n : n;
}

function normalizar(t: string) {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Localiza as colunas obrigatórias no cabeçalho lido e devolve o índice de cada
 * uma. Lança um erro legível listando as que estiverem faltando.
 */
export function mapearColunas(
  cabecalho: Celula[],
  obrigatorias: Record<string, string[]>,
): Record<string, number> {
  const normal = cabecalho.map((c) => normalizar(textoCelula(c)));
  const mapa: Record<string, number> = {};
  const faltando: string[] = [];
  for (const [chave, apelidos] of Object.entries(obrigatorias)) {
    const idx = normal.findIndex((h) =>
      apelidos.some((a) => h === normalizar(a) || h.startsWith(normalizar(a))),
    );
    if (idx === -1) faltando.push(apelidos[0] ?? chave);
    else mapa[chave] = idx;
  }
  if (faltando.length) {
    throw new Error(
      `Planilha fora do padrão: falta a coluna ${faltando
        .map((f) => `"${f}"`)
        .join(", ")}. Exporte o modelo por esta tela e preencha sem renomear o cabeçalho.`,
    );
  }
  return mapa;
}

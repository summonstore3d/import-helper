import * as XLSX from "xlsx-js-style";

/**
 * Utilitários de leitura e escrita de planilhas Excel (.xlsx) padronizadas.
 *
 * Padrão visual: cabeçalho em negrito com fundo escuro, colunas de dinheiro no
 * formato "R$ #.##0,00" e largura de coluna definida por aba.
 */

export type Celula = string | number | null;

export const FORMATO_MOEDA = 'R$ #,##0.00';
export const FORMATO_PERCENTUAL = "0.00%";

export type DefinicaoAba = {
  nome: string;
  /** Primeira linha: títulos das colunas. Demais linhas: dados. */
  linhas: Celula[][];
  larguras?: number[];
  /** Índices (0-based) das colunas que devem sair formatadas como moeda. */
  colunasMoeda?: number[];
  /** Índices (0-based) das colunas formatadas como percentual. */
  colunasPercentual?: number[];
  /** Índices (0-based, contando a partir da 1ª linha de dados) de linhas de destaque. */
  linhasDestaque?: number[];
};

const ESTILO_CABECALHO = {
  font: { name: "Arial", bold: true, sz: 11, color: { rgb: "FFFFFFFF" } },
  fill: { patternType: "solid", fgColor: { rgb: "FF1F3A5F" } },
  alignment: { vertical: "center", horizontal: "left", wrapText: true },
  border: {
    bottom: { style: "thin", color: { rgb: "FF1F3A5F" } },
  },
} as const;

const ESTILO_CORPO = { font: { name: "Arial", sz: 10 } } as const;
const ESTILO_DESTAQUE = {
  font: { name: "Arial", sz: 10, bold: true },
  fill: { patternType: "solid", fgColor: { rgb: "FFEFF3F8" } },
} as const;

function montarAba(def: DefinicaoAba): XLSX.WorkSheet {
  const sheet = XLSX.utils.aoa_to_sheet(def.linhas.map((l) => l.map((c) => (c === null ? "" : c))));
  const totalColunas = def.linhas.reduce((m, l) => Math.max(m, l.length), 0);
  const moeda = new Set(def.colunasMoeda ?? []);
  const percentual = new Set(def.colunasPercentual ?? []);
  const destaque = new Set(def.linhasDestaque ?? []);

  for (let r = 0; r < def.linhas.length; r += 1) {
    for (let c = 0; c < totalColunas; c += 1) {
      const ref = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[ref] as XLSX.CellObject | undefined;
      if (!cell) continue;
      if (r === 0) {
        cell.s = ESTILO_CABECALHO;
        continue;
      }
      cell.s = destaque.has(r - 1) ? { ...ESTILO_DESTAQUE } : { ...ESTILO_CORPO };
      if (cell.t === "n") {
        if (moeda.has(c)) cell.z = FORMATO_MOEDA;
        else if (percentual.has(c)) cell.z = FORMATO_PERCENTUAL;
      }
    }
  }

  sheet["!cols"] = Array.from({ length: totalColunas }, (_, c) => ({
    wch: def.larguras?.[c] ?? 16,
  }));
  sheet["!freeze"] = { xSplit: 0, ySplit: 1 };
  sheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: Math.max(def.linhas.length - 1, 0), c: Math.max(totalColunas - 1, 0) },
    }),
  };
  return sheet;
}

/** Gera o arquivo .xlsx e dispara o download no navegador. */
export function baixarExcel(nomeArquivo: string, abas: DefinicaoAba[]) {
  const wb = XLSX.utils.book_new();
  abas.forEach((def) => {
    XLSX.utils.book_append_sheet(wb, montarAba(def), def.nome.slice(0, 31));
  });
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

/** Lê a primeira aba (ou a aba informada) de um .xlsx como matriz de células. */
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

/** Converte uma célula em número, aceitando valores digitados no padrão brasileiro. */
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

/**
 * Localiza as colunas obrigatórias no cabeçalho e devolve o índice de cada uma.
 * Lança um erro legível listando o que estiver faltando.
 */
export function mapearColunas(
  cabecalho: Celula[],
  obrigatorias: Record<string, string[]>,
): Record<string, number> {
  const normal = cabecalho.map((c) =>
    textoCelula(c)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""),
  );
  const mapa: Record<string, number> = {};
  const faltando: string[] = [];
  for (const [chave, apelidos] of Object.entries(obrigatorias)) {
    const idx = normal.findIndex((h) =>
      apelidos.some((a) => {
        const alvo = a
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        return h === alvo || h.startsWith(alvo);
      }),
    );
    if (idx === -1) faltando.push(apelidos[0] ?? chave);
    else mapa[chave] = idx;
  }
  if (faltando.length) {
    throw new Error(
      `A planilha está fora do padrão: falta a coluna ${faltando
        .map((f) => `"${f}"`)
        .join(", ")}. Exporte o modelo por esta tela e preencha sem renomear o cabeçalho.`,
    );
  }
  return mapa;
}

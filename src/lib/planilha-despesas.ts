import type { Despesas } from "@/data";

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

  const sep = (linhas[0].split(";").length >= linhas[0].split(",").length ? ";" : ",") as string;
  const cabecalho = separarLinhaCsv(linhas[0], sep);
  if (cabecalho.length < 3 || cabecalho[1].toLowerCase() !== "conta") {
    throw new Error(
      'Cabeçalho inesperado. Use o arquivo exportado por esta tela (colunas "Tipo", "Conta" e os meses).',
    );
  }
  const totalMeses = base.meses.length;

  const mapaLinhas = new Map<string, number[]>();
  const mapaRodape = new Map<string, number[]>();
  const ignoradas: string[] = [];
  let atualizadas = 0;

  const chave = (tipo: string, nome: string) => `${tipo}::${nome.trim().toLowerCase()}`;

  const valoresPorChave = new Map<string, (number | null)[]>();
  for (let i = 1; i < linhas.length; i += 1) {
    const campos = separarLinhaCsv(linhas[i], sep);
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

  void mapaLinhas;
  void mapaRodape;
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

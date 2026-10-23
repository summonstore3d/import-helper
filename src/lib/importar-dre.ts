import * as XLSX from "xlsx-js-style";
import type { Despesas } from "@/data";

/**
 * Importação mensal do DRE Gerencial. Lê apenas as abas cujo nome termina em
 * "Geral", converte cada uma em um mês do demonstrativo e decide, por
 * competência (mês/ano), se o mês é novo, substitui o mesmo mês do ano
 * anterior ou já está cadastrado.
 */

export const MESES_ANO = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];

export type MesDre = {
  mes: string; // nome do mês em maiúsculas
  aba: string;
  /** valores por seção (código "005", "007"...) e nome normalizado da conta */
  contas: Map<string, Map<string, number>>;
  grupos: Map<string, number>;
  receita: number | null;
  devolucao: number;
};

export function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/** Nomes do sistema → nome usado no DRE, quando diferem. */
const ALIASES: Record<string, string> = {
  TOTALMAODEOBRAMOD: "TOTALDEMAODEOBRAMOD",
  SALARIOMODMAODEOBRADIRETA: "SALARIOLIQUIDOMAODEOBRADIRETA",
  SALARIOMODTERCEIROSNOVAERA: "SALARIOTERCEIROSNOVAERA",
  ALMOCOS: "ALMOCOS",
  ALMOCO: "ALMOCOS",
  ALMOCOSABADO: "ALMOCOSABADOS",
  INSSTERCEIROS: "INSSTERCEIROS5S",
  PROVISAO13SALARIOINCLUINDO13SDASFERIAS: "PROVISAO13SALARIO",
  PROVISAODO13SALARIOINCLUINDO13SDASFERIAS: "PROVISAO13SALARIO",
  PROVISAODEFERIAS: "PROVISAOFERIAS",
  RECRUTAMENTOESELECAO: "RECRUTAMENTOESELECOES",
  MARKETING: "MARKETINGHOSPEDAGEMSITES",
  SALARIOMOIMAODEOBRAINDIRETA: "SALARIOLIQUIDOMAODEOBRAINDIRETA",
  INTERNETHOSPEDAGEMSITES: "INTERNET",
  ISSRETENCOESDEPRESTADORESSERVICOS: "ISSQNRETENCOESDEPRESTADORESSERVICOS",
  MATERIALDECOPACOZINHAEREFEITORIO: "COPACOZINHAEREFEITORIO",
  MOTOBOYCORREIOS: "MOTOBOYCORREIOS",
};

function codigoGrupo(nome: string): string | null {
  return nome.match(/(\d{3})\s*-/)?.[1] ?? null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Converte a matriz de uma aba "Geral" (colunas Tipo, Subtipo, Valor, %). */
export function lerAbaGeral(aba: string, linhas: unknown[][]): MesDre {
  const mesAba = MESES_ANO.find((m) => normalizar(aba).startsWith(normalizar(m)));
  const mesTitulo = MESES_ANO.find((m) => linhas.slice(0, 3).some((l) => l.some((c) => typeof c === "string" && normalizar(c) === normalizar(m))));
  const mes = mesTitulo ?? mesAba;
  if (!mes) throw new Error(`Não foi possível identificar o mês da aba "${aba}".`);
  const contas = new Map<string, Map<string, number>>();
  const grupos = new Map<string, number>();
  let secao: string | null = null;
  let receita: number | null = null;
  let devolucao = 0;
  for (const l of linhas) {
    const sub = typeof l[1] === "string" ? l[1] : "";
    if (!sub.trim()) continue;
    const valor = num(l[2]);
    const cod = /^\s*\d{3}\s*-/.test(sub) ? codigoGrupo(sub) : null;
    if (cod) {
      secao = cod;
      if (valor !== null) grupos.set(cod, valor);
      if (cod === "001") receita = valor;
      continue;
    }
    if (!secao) continue;
    if (secao === "002" && normalizar(sub).startsWith("DEVOLUCAO")) devolucao += valor ?? 0;
    const mapa = contas.get(secao) ?? new Map<string, number>();
    const k = normalizar(sub);
    if (!mapa.has(k)) mapa.set(k, valor ?? 0);
    contas.set(secao, mapa);
  }
  return { mes, aba, contas, grupos, receita, devolucao };
}

export async function lerDreGerencial(arquivo: File): Promise<MesDre[]> {
  const wb = XLSX.read(await arquivo.arrayBuffer(), { type: "array" });
  const abas = wb.SheetNames.filter((n) => normalizar(n).endsWith("GERAL"));
  if (!abas.length) throw new Error('Nenhuma aba com "Geral" no final do nome foi encontrada.');
  return abas.map((n) => {
    const ws = wb.Sheets[n];
    const m = ws ? (XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null }) as unknown[][]) : [];
    return lerAbaGeral(n, m);
  });
}

export function anoDoArquivo(nome: string): number | null {
  const m = nome.match(/(20\d{2})/);
  return m ? Number(m[1]) : null;
}

/* ------------------------- competências do sistema ------------------------- */

export type Competencia = { mes: string; ano: number };

/**
 * Ano de cada coluna. Colunas antigas sem ano ("OUTUBRO") seguem a base
 * original: OUTUBRO a DEZEMBRO de 2025 e JANEIRO a SETEMBRO de 2026.
 */
export function competenciasDoSistema(d: Despesas): Competencia[] {
  return d.meses.map((rotulo) => {
    const [nome = "", anoTxt] = rotulo.trim().toUpperCase().split("/");
    const mes = MESES_ANO.find((m) => normalizar(m) === normalizar(nome)) ?? nome;
    const ano = anoTxt && /^\d{4}$/.test(anoTxt) ? Number(anoTxt) : MESES_ANO.indexOf(mes) >= 9 ? 2025 : 2026;
    return { mes, ano };
  });
}

function faturamentoIdx(d: Despesas) {
  return d.rodape.findIndex((r) => r.nome.toLowerCase().includes("faturamento"));
}

export function mesCadastrado(d: Despesas, coluna: number): boolean {
  const fat = d.rodape[faturamentoIdx(d)]?.valores[coluna];
  return typeof fat === "number" && fat > 0;
}

export type Situacao = "novo" | "vazio" | "substitui" | "cadastrado";
export type Analise = { dre: MesDre; ano: number; situacao: Situacao; coluna: number | null; substituido: string | null };

/** Classifica cada mês do arquivo frente ao demonstrativo atual. */
export function analisarMeses(d: Despesas, meses: MesDre[], ano: number): Analise[] {
  const comps = competenciasDoSistema(d);
  return meses.map((dre) => {
    const mesmo = comps.findIndex((c) => c.mes === dre.mes && c.ano === ano);
    if (mesmo >= 0) {
      return { dre, ano, situacao: mesCadastrado(d, mesmo) ? "cadastrado" : "vazio", coluna: mesmo, substituido: null };
    }
    const anterior = comps.findIndex((c) => c.mes === dre.mes && c.ano < ano);
    if (anterior >= 0) {
      return { dre, ano, situacao: "substitui", coluna: anterior, substituido: d.meses[anterior] ?? null };
    }
    return { dre, ano, situacao: "novo", coluna: null, substituido: null };
  });
}

/** O mês mais recente do arquivo que ainda não está cadastrado. */
export function ultimoNaoCadastrado(analises: Analise[]): Analise | null {
  const pend = analises.filter((a) => a.situacao !== "cadastrado");
  return pend.sort((a, b) => MESES_ANO.indexOf(b.dre.mes) - MESES_ANO.indexOf(a.dre.mes))[0] ?? null;
}

/* ------------------------------ aplicação ------------------------------ */

export function valorDaConta(dre: MesDre, grupo: string, nome: string): number | null {
  const mapa = dre.contas.get(grupo);
  if (!mapa) return null;
  const k = normalizar(nome);
  const alvo = ALIASES[k] ?? k;
  for (const cand of [alvo, k, `${k}S`, k.replace(/S$/, "")]) {
    const v = mapa.get(cand);
    if (v !== undefined) return v;
  }
  return null;
}

export type ResultadoDre = { despesas: Despesas; naoEncontradas: string[] };

export function aplicarMesDre(d: Despesas, a: Analise): ResultadoDre {
  const novo = structuredClone(d);
  const rotulo = `${a.dre.mes}/${a.ano}`;
  let col = a.coluna;
  if (col === null) {
    novo.meses.push(rotulo);
    novo.linhas.forEach((l) => l.valores.push({ valor: null, percentual: null }));
    novo.rodape.forEach((r) => r.valores.push(null));
    col = novo.meses.length - 1;
  } else {
    novo.meses[col] = rotulo;
  }
  const fat = a.dre.receita === null ? null : a.dre.receita - a.dre.devolucao;
  const naoEncontradas: string[] = [];
  let grupo = "";
  const totais: Record<string, number> = {};
  novo.linhas.forEach((l) => {
    let valor: number | null;
    if (l.tipo === "grupo") {
      grupo = codigoGrupo(l.nome) ?? "";
      valor = a.dre.grupos.get(grupo) ?? null;
      totais[grupo] = valor ?? 0;
    } else {
      valor = valorDaConta(a.dre, grupo, l.nome);
      if (valor === null) naoEncontradas.push(l.nome);
    }
    l.valores[col] = { valor, percentual: fat && valor !== null ? valor / fat : null };
  });
  const total = (totais["007"] ?? 0) + (totais["009"] ?? 0) + (totais["010"] ?? 0);
  novo.rodape.forEach((r) => {
    const n = r.nome.toLowerCase();
    r.valores[col] = /\bvar\b/.test(n)
      ? totais["007"] ?? 0
      : /\bpes\b/.test(n)
        ? totais["009"] ?? 0
        : /\bop\b/.test(n)
          ? totais["010"] ?? 0
          : n.includes("faturamento")
            ? fat
            : n.includes("%")
              ? fat ? total / fat : null
              : n.includes("total")
                ? total
                : r.valores[col] ?? null;
  });
  ordenarCronologicamente(novo);
  return { despesas: novo, naoEncontradas };
}

function ordenarCronologicamente(d: Despesas) {
  const comps = competenciasDoSistema(d);
  const ordem = comps.map((c, i) => ({ i, k: c.ano * 12 + MESES_ANO.indexOf(c.mes) })).sort((a, b) => a.k - b.k).map((o) => o.i);
  if (ordem.every((v, i) => v === i)) return;
  d.meses = ordem.map((i) => d.meses[i] ?? "");
  d.linhas.forEach((l) => { l.valores = ordem.map((i) => l.valores[i] ?? { valor: null, percentual: null }); });
  d.rodape.forEach((r) => { r.valores = ordem.map((i) => r.valores[i] ?? null); });
}

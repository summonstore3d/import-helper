import produtosRaw from "./produtos.json";
import insumosRaw from "./insumos.json";
import bomRaw from "./bom.json";
import mpTotaisRaw from "./mp-totais.json";
import centroCustosRaw from "./centro-custos.json";
import guiaCdcRaw from "./guia-cdc.json";
import logisticaRaw from "./logistica.json";
import salariosRaw from "./salarios.json";
import impostosRaw from "./impostos.json";
import despesasRaw from "./despesas.json";
import parametrosRaw from "./parametros.json";

export type Produto = { codigo: string; descricao: string; full: string };
export type Insumo = {
  codigo: string;
  descricao: string;
  full: string;
  custoUnitario: number | null;
};
export type BomLinha = {
  produto: string;
  item: string;
  tipo: string;
  quantidade: number | null;
  unidade: string | null;
  custoUnitario: number | null;
  custoTotal: number | null;
};
export type Setor = {
  nome: string;
  grupo: string | null;
  maoDeObra: number | string | null;
  manutencao: number | string | null;
  mesTotal: number | string | null;
  eficienciaPerdida: number | string | null;
  acabamento: number | string | null;
  transporteInterno: number | string | null;
  horasDisponiveis: number | string | null;
  horaPonte: number | string | null;
  horaIdeal: number | string | null;
  horaReal: number | string | null;
};
export type RoteiroLinha = {
  produto: string;
  setor: string | null;
  horaSetor: number | string | null;
  horaProduto: number | string | null;
  central: number | string | null;
  horaArmacao: number | string | null;
  custoArmacao: number | string | null;
  pintura: number | string | null;
  custoProducao: number | string | null;
  kgPorProduto: number | string | null;
};
export type GuiaCdc = {
  maoDeObra: { funcao: string; valores: Record<string, number | string | null> }[];
  manutencao: {
    setor: string;
    total: number | null;
    percentual: number | null;
    manutencaoSetor: number | null;
  }[];
};
export type Logistica = {
  fixos: { item: string; valor: number }[];
  variaveis: { item: string; valor: number }[];
  totalFixos: number;
  totalVariaveisPorKm: number;
  kmRodadosMes: number;
  custoTotalPorKm: number;
};
export type Salarios = {
  categorias: {
    categoria: string;
    salarioTotal: number | null;
    colaboradores: number | null;
    salarioMedio: number | null;
  }[];
  observacoes: string[];
};
export type CenarioImposto = {
  nome: string;
  itens: {
    produto: string;
    icms: number | null;
    pis: number | null;
    cofins: number | null;
    irpj: number | null;
    csll: number | null;
    total: number | null;
  }[];
};
export type Impostos = {
  cenarios: CenarioImposto[];
  tonial: {
    nome: string;
    faturamento12m: number | null;
    faturamentoMes: number | null;
    aliquota: number | null;
    valorDeduzir: number | null;
    tributoMes: number | null;
    faixas: { de: number | null; ate: number | null; aliquota: number | null; deduzir: number | null }[];
  };
};
export type Despesas = {
  meses: string[];
  linhas: {
    nome: string;
    tipo: "grupo" | "conta";
    valores: { valor: number | null; percentual: number | null }[];
  }[];
  rodape: { nome: string; valores: (number | null)[] }[];
  mediaDespesas: number;
};
export type Parametros = {
  produtoExemplo: string;
  despesasPercentual: number;
  margemPadrao: number;
  comissao: number;
  inadimplencia: number;
  pecasPorEntregaPadrao: number;
  kmPadrao: number;
  fatorFrete: number;
  cenarios: string[];
};

export const produtos = produtosRaw as Produto[];
export const insumos = insumosRaw as Insumo[];
export const bom = bomRaw as BomLinha[];
export const mpTotais = mpTotaisRaw as Record<string, number>;
export const centroCustos = centroCustosRaw as { setores: Setor[]; roteiro: RoteiroLinha[] };
export const guiaCdc = guiaCdcRaw as GuiaCdc;
export const logistica = logisticaRaw as Logistica;
export const salarios = salariosRaw as Salarios;
export const impostos = impostosRaw as Impostos;
export const despesas = despesasRaw as Despesas;
export const parametros = parametrosRaw as Parametros;

/** Categoria derivada do prefixo do código real do produto. */
export function categoriaDoProduto(full: string): string {
  const desc = full.split(" - ").slice(1).join(" - ").toUpperCase();
  const mapa: [string, string][] = [
    ["ANEL DE CONCRETO", "ANEL"],
    ["ANEL", "ANEL"],
    ["TUBO", "TUBO"],
    ["GALERIA", "GALERIA"],
    ["CAIXA", "CAIXA DE INSPEÇÃO"],
    ["MEIO FIO", "MEIO FIO"],
    ["CONE", "CONE"],
    ["GRADIL", "GRADIL"],
    ["GRELHA", "GRELHA"],
    ["LAJE", "LAJE"],
    ["TAMPA", "TAMPA"],
    ["BOCA DE LOBO", "BOCA DE LOBO"],
    ["BLOCO", "BLOCO"],
    ["POSTE", "POSTE"],
    ["PLACA", "PLACA"],
  ];
  for (const [chave, cat] of mapa) if (desc.includes(chave)) return cat;
  return "OUTROS";
}

export const unidadePorProduto = (full: string): string => {
  const linhas = bom.filter((l) => l.item === full);
  return linhas[0]?.unidade ?? "UN";
};

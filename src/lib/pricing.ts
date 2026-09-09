import {
  bom,
  categoriaDoProduto,
  centroCustos,
  impostos,
  logistica,
  mpTotais,
  parametros,
  type BomLinha,
} from "@/data";
import { isNum } from "./format";

export type ItemMP = {
  item: string;
  tipo: string;
  quantidade: number | null;
  unidade: string | null;
  custoUnitario: number | null;
  custoTotal: number | null;
  demonstrativo?: boolean;
};

/** BOM real do produto (uma linha por componente). */
export function bomDoProduto(produto: string): BomLinha[] {
  return bom.filter((l) => l.produto === produto);
}

export function totalMP(itens: ItemMP[]): number {
  return itens.reduce((s, i) => s + (isNum(i.custoTotal) ? i.custoTotal : 0), 0);
}

export function custoMPOriginal(produto: string): number | null {
  const v = mpTotais[produto];
  return isNum(v) ? v : null;
}

export function roteiroDoProduto(produto: string) {
  return centroCustos.roteiro.find((r) => r.produto === produto) ?? null;
}

/** Custo de produção (Centro de Custos) — coluna "Custo" da planilha. */
export function custoProducao(produto: string): number | null {
  const r = roteiroDoProduto(produto);
  return r && isNum(r.custoProducao) ? r.custoProducao : null;
}

export type Cenario = "Venda Normal" | "Venda com Base Reduzida" | "Venda com Material Via Tonial";

export type RegraTributaria = {
  cenario: string;
  categoria: string | null;
  total: number | null;
  detalhe: { icms: number | null; pis: number | null; cofins: number | null; irpj: number | null; csll: number | null } | null;
  demonstrativo: boolean;
  observacao?: string;
};

/** Encontra a regra tributária real do cenário para a categoria do produto. */
export function regraTributaria(produto: string, cenario: Cenario): RegraTributaria {
  const categoria = categoriaDoProduto(produto);
  if (cenario === "Venda com Material Via Tonial") {
    return {
      cenario,
      categoria,
      total: impostos.tonial.aliquota,
      detalhe: null,
      demonstrativo: true,
      observacao:
        "Cenário do Simples (alíquota por faixa de faturamento). Aplicação por produto: regra a validar.",
    };
  }
  const nome = cenario === "Venda Normal" ? "VENDA NORMAL" : "VENDA COM BASE REDUZIDA";
  const grupo = impostos.cenarios.find((c) => c.nome === nome);
  const item = grupo?.itens.find((i) => categoria.startsWith(i.produto) || i.produto === categoria);
  if (item) {
    return {
      cenario,
      categoria,
      total: item.total,
      detalhe: {
        icms: item.icms,
        pis: item.pis,
        cofins: item.cofins,
        irpj: item.irpj,
        csll: item.csll,
      },
      demonstrativo: false,
    };
  }
  const primeiro = grupo?.itens[0] ?? null;
  return {
    cenario,
    categoria,
    total: primeiro?.total ?? null,
    detalhe: primeiro
      ? {
          icms: primeiro.icms,
          pis: primeiro.pis,
          cofins: primeiro.cofins,
          irpj: primeiro.irpj,
          csll: primeiro.csll,
        }
      : null,
    demonstrativo: true,
    observacao: `A categoria "${categoria}" não consta na tabela de ${nome} da planilha. Alíquota exibida é demonstrativa — regra a validar.`,
  };
}

export type EntradaCalculo = {
  produto: string;
  cenario: Cenario;
  itensMP: ItemMP[];
  margem: number;
  comissao: number;
  inadimplencia: number;
  despesas: number;
  frota: boolean;
  km: number;
  pecasPorEntrega: number;
};

export type ResultadoCalculo = {
  produto: string;
  cenario: Cenario;
  custoMP: number;
  custoProducao: number | null;
  producaoDemonstrativa: boolean;
  despesas: number;
  logistica: number;
  custoAbsoluto: number;
  impostos: number | null;
  impostosDemonstrativos: boolean;
  observacaoImpostos?: string;
  comissao: number;
  inadimplencia: number;
  margem: number;
  somaPercentuais: number;
  preco: number | null;
  itensMP: ItemMP[];
  regra: RegraTributaria;
};

export function parametrosPadrao() {
  return {
    despesas: parametros.despesasPercentual,
    margem: parametros.margemPadrao,
    comissao: parametros.comissao,
    inadimplencia: parametros.inadimplencia,
    km: parametros.kmPadrao,
    pecasPorEntrega: parametros.pecasPorEntregaPadrao,
  };
}

/**
 * Regra de preço reimplementada em código (não é a fórmula da planilha):
 * preço = (MP + produção) / (1 - (despesas + margem + impostos + comissão + inadimplência)) + frete
 * frete = (km / peças por entrega) * custo por km * 1,5, apenas quando a entrega usa frota própria.
 */
export function calcularPreco(e: EntradaCalculo): ResultadoCalculo {
  const custoMP = totalMP(e.itensMP);
  const producao = custoProducao(e.produto);
  const regra = regraTributaria(e.produto, e.cenario);
  const frete =
    e.frota && e.pecasPorEntrega > 0
      ? (e.km / e.pecasPorEntrega) * logistica.custoTotalPorKm * parametros.fatorFrete
      : 0;
  const custoAbsoluto = custoMP + (isNum(producao) ? producao : 0);
  const somaPercentuais =
    e.despesas + e.margem + (isNum(regra.total) ? regra.total : 0) + e.comissao + e.inadimplencia;
  const preco =
    isNum(producao) && isNum(regra.total) && somaPercentuais < 1
      ? custoAbsoluto / (1 - somaPercentuais) + frete
      : null;

  const resultado: ResultadoCalculo = {
    produto: e.produto,
    cenario: e.cenario,
    custoMP,
    custoProducao: producao,
    producaoDemonstrativa: !isNum(producao),
    despesas: e.despesas,
    logistica: frete,
    custoAbsoluto,
    impostos: regra.total,
    impostosDemonstrativos: regra.demonstrativo,
    comissao: e.comissao,
    inadimplencia: e.inadimplencia,
    margem: e.margem,
    somaPercentuais,
    preco,
    itensMP: e.itensMP,
    regra,
  };
  if (regra.observacao) resultado.observacaoImpostos = regra.observacao;
  return resultado;
}

export function precoRapido(produto: string, cenario: Cenario = "Venda Normal"): number | null {
  const p = parametrosPadrao();
  return calcularPreco({
    produto,
    cenario,
    itensMP: bomDoProduto(produto),
    margem: p.margem,
    comissao: p.comissao,
    inadimplencia: p.inadimplencia,
    despesas: p.despesas,
    frota: false,
    km: p.km,
    pecasPorEntrega: p.pecasPorEntrega,
  }).preco;
}

export function cenarioSugerido(produto: string): Cenario {
  const categoria = categoriaDoProduto(produto);
  const reduzida = impostos.cenarios.find((c) => c.nome === "VENDA COM BASE REDUZIDA");
  if (reduzida?.itens.some((i) => i.produto === categoria)) return "Venda com Base Reduzida";
  return "Venda Normal";
}

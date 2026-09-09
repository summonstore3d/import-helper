import {
  bom,
  categoriaDoProduto,
  centroCustos,
  impostos,
  parametros,
  type BomLinha,
} from "@/data";
import { isNum } from "./format";
import {
  custearItem,
  DESPESAS_PERCENTUAL,
  descricaoProblema,
  fretePorPeca,
  producaoCorrigida,
  simplesVigente,
  type ItemCusteado,
} from "./correcoes";

export type ItemMP = ItemCusteado;

/** BOM real do produto, já com os custos recalculados (Quantidade × Custo unitário). */
export function bomDoProduto(produto: string): ItemMP[] {
  return bom.filter((l) => l.produto === produto).map((l) => custearItem(l));
}

export function bomBruto(produto: string): BomLinha[] {
  return bom.filter((l) => l.produto === produto);
}

export function totalMP(itens: ItemMP[]): number {
  return itens.reduce((s, i) => s + (isNum(i.custoTotal) ? i.custoTotal : 0), 0);
}

export function custoMPOriginal(produto: string): number | null {
  const itens = bomDoProduto(produto);
  return itens.length ? totalMP(itens) : null;
}

export function roteiroDoProduto(produto: string) {
  return centroCustos.roteiro.find((r) => r.produto === produto) ?? null;
}

/** Custo de produção corrigido (armação contada uma única vez). */
export function custoProducao(produto: string): number | null {
  return producaoCorrigida(produto).valor;
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
    const s = simplesVigente;
    return {
      cenario,
      categoria,
      total: s.aliquotaEfetiva,
      detalhe: null,
      demonstrativo: false,
      observacao: `Simples Nacional: alíquota efetiva = (RBT12 × ${
        s.aliquotaNominal !== null ? (s.aliquotaNominal * 100).toFixed(2) : "—"
      }% − dedução) ÷ RBT12, calculada sobre o faturamento dos últimos 12 meses.`,
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
  custoProducaoPlanilha: number | null;
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
  precoBruto: number | null;
  preco: number | null;
  bloqueios: string[];
  alertas: string[];
  reconciliacao: { diferenca: number; ok: boolean } | null;
  itensMP: ItemMP[];
  regra: RegraTributaria;
  producao: ReturnType<typeof producaoCorrigida>;
};

export function parametrosPadrao() {
  return {
    despesas: DESPESAS_PERCENTUAL,
    margem: parametros.margemPadrao,
    comissao: parametros.comissao,
    inadimplencia: parametros.inadimplencia,
    km: parametros.kmPadrao,
    pecasPorEntrega: parametros.pecasPorEntregaPadrao,
  };
}

/**
 * Markup divisor (auditoria, item 6):
 *   Preço bruto = Custos absolutos / (1 − p), com 0 ≤ p < 100%
 *   p = despesas% + impostos% + comissão% + inadimplência% + margem%
 * O frete de entrega é somado depois, por não ser proporcional ao preço.
 */
export function calcularPreco(e: EntradaCalculo): ResultadoCalculo {
  const custoMP = totalMP(e.itensMP);
  const producao = producaoCorrigida(e.produto);
  const regra = regraTributaria(e.produto, e.cenario);
  const frete = e.frota ? fretePorPeca(e.km, e.pecasPorEntrega, parametros.fatorFrete) : 0;
  const custoAbsoluto = custoMP + (isNum(producao.valor) ? producao.valor : 0);
  const somaPercentuais =
    e.despesas + e.margem + (isNum(regra.total) ? regra.total : 0) + e.comissao + e.inadimplencia;

  const bloqueios: string[] = [];
  const alertas: string[] = [...producao.alertas];

  if (!e.itensMP.length) bloqueios.push("Produto sem estrutura (BOM) cadastrada.");
  for (const item of e.itensMP) {
    for (const p of item.problemas) {
      const texto = `${item.item}: ${descricaoProblema(p)}`;
      if (p === "sem-cadastro" || p === "custo-zero") bloqueios.push(texto);
      else alertas.push(texto);
    }
  }
  if (!isNum(producao.valor)) bloqueios.push("Custo de produção indisponível para este produto.");
  if (!isNum(regra.total)) bloqueios.push("Cenário tributário sem alíquota definida.");
  if (!(somaPercentuais >= 0 && somaPercentuais < 1))
    bloqueios.push(
      "Soma dos percentuais fora do intervalo válido (0% a 100%). O markup divisor não pode ser aplicado.",
    );

  const precoBruto =
    bloqueios.length === 0 ? custoAbsoluto / (1 - somaPercentuais) : null;
  const preco = precoBruto === null ? null : Math.round((precoBruto + frete) * 100) / 100;

  const reconciliacao =
    precoBruto === null
      ? null
      : (() => {
          const diferenca = precoBruto - (custoAbsoluto + precoBruto * somaPercentuais);
          return { diferenca, ok: Math.abs(diferenca) < 0.01 };
        })();

  const resultado: ResultadoCalculo = {
    produto: e.produto,
    cenario: e.cenario,
    custoMP,
    custoProducao: producao.valor,
    custoProducaoPlanilha: producao.original,
    producaoDemonstrativa: producao.armacaoEstimada,
    despesas: e.despesas,
    logistica: frete,
    custoAbsoluto,
    impostos: regra.total,
    impostosDemonstrativos: regra.demonstrativo,
    comissao: e.comissao,
    inadimplencia: e.inadimplencia,
    margem: e.margem,
    somaPercentuais,
    precoBruto,
    preco,
    bloqueios,
    alertas,
    reconciliacao,
    itensMP: e.itensMP,
    regra,
    producao,
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

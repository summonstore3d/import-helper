/**
 * Correções aplicadas ao modelo herdado da planilha, conforme a auditoria de 28.08.2026.
 *
 * Cada bloco abaixo documenta a fórmula original da planilha, o problema apontado
 * pela auditoria e a regra que passa a valer no sistema.
 */
import { bom, centroCustos, despesas, impostos, insumos, logistica, mpTotais } from "@/data";
import { isNum } from "./format";

/* ------------------------------------------------------------------ *
 * Constantes documentadas (auditoria: item "constantes sem racional")
 * ------------------------------------------------------------------ */

export type ConstanteDocumentada = {
  simbolo: string;
  valor: number;
  unidade: string;
  racional: string;
  origem: string;
};

export const CONSTANTES: ConstanteDocumentada[] = [
  {
    simbolo: "Eficiência produtiva",
    valor: 0.85,
    unidade: "% das horas nominais",
    racional:
      "Apenas 85% das horas disponíveis são produtivas. O custo por hora é calculado sobre a hora produtiva (hora real), nunca aplicado duas vezes.",
    origem: "Centro de Custos / Guia - CDC",
  },
  {
    simbolo: "Rendimento da frota",
    valor: 2.69,
    unidade: "km/L",
    racional:
      "Rótulo original 'Consumo Diesel/Km' estava invertido. A fórmula R$/L ÷ 2,69 só é dimensionalmente correta se 2,69 for km por litro.",
    origem: "Logística",
  },
  {
    simbolo: "Fator de frete",
    valor: 1.5,
    unidade: "multiplicador",
    racional:
      "Cobre o retorno vazio do caminhão e o tempo de descarga: 1 trecho carregado + 0,5 de retorno/manobra.",
    origem: "Precificação / Logística",
  },
  {
    simbolo: "Horas mensais por posto",
    valor: 173.2,
    unidade: "h/mês",
    racional: "Jornada de 40 h semanais × 52 semanas ÷ 12 meses = 173,2 h.",
    origem: "Centro de Custos",
  },
];

/* ------------------------------------------------------------------ *
 * 1. Centro de Custos — armação
 *
 * Planilha:  I = taxa × Horas   e   K = HoraProduto×HoraSetor + Central + I×Horas + Pintura
 *            → a armação era multiplicada pelas horas DUAS vezes.
 * Sistema :  Custo de armação = Horas de armação × Taxa do setor de armação (uma única vez).
 * ------------------------------------------------------------------ */

const setorArmacao = centroCustos.setores.find((s) => s.grupo === "Armação");

/** R$/hora do setor de armação (Robô) — usado quando a linha não traz custo próprio. */
export const TAXA_ARMACAO_PADRAO = isNum(setorArmacao?.horaReal) ? setorArmacao.horaReal : 287.1666;

export type ProducaoCorrigida = {
  produto: string;
  valor: number | null;
  original: number | null;
  diferenca: number | null;
  componentes: {
    setor: number;
    central: number;
    armacao: number;
    pintura: number;
  } | null;
  horasArmacao: number;
  taxaArmacao: number | null;
  duplaMultiplicacaoCorrigida: boolean;
  armacaoEstimada: boolean;
  referenciaQuebrada: boolean;
  alertas: string[];
};

export function roteiroDe(produto: string) {
  return centroCustos.roteiro.find((r) => r.produto === produto) ?? null;
}

export function producaoCorrigida(produto: string): ProducaoCorrigida {
  const r = roteiroDe(produto);
  const base: ProducaoCorrigida = {
    produto,
    valor: null,
    original: null,
    diferenca: null,
    componentes: null,
    horasArmacao: 0,
    taxaArmacao: null,
    duplaMultiplicacaoCorrigida: false,
    armacaoEstimada: false,
    referenciaQuebrada: false,
    alertas: [],
  };
  if (!r) {
    base.alertas.push("Produto sem roteiro de produção no Centro de Custos.");
    return base;
  }

  const original = isNum(r.custoProducao) ? r.custoProducao : null;
  base.original = original;

  const horaProduto = isNum(r.horaProduto) ? r.horaProduto : null;
  const horaSetor = isNum(r.horaSetor) ? r.horaSetor : null;
  const central = isNum(r.central) ? r.central : 0;
  const pintura = isNum(r.pintura) ? r.pintura : 0;
  const horas = isNum(r.horaArmacao) ? r.horaArmacao : 0;
  base.horasArmacao = horas;

  if (horaProduto === null || horaSetor === null) {
    base.referenciaQuebrada = true;
    base.alertas.push(
      "Referência quebrada no Centro de Custos (setor ou hora do produto inválidos). O preço fica bloqueado até a correção.",
    );
    return base;
  }

  let armacao = 0;
  if (horas > 0) {
    if (isNum(r.custoArmacao) && r.custoArmacao > 0) {
      // A planilha já grava aqui Horas × Taxa; o erro estava em multiplicar de novo por Horas.
      armacao = r.custoArmacao;
      base.taxaArmacao = r.custoArmacao / horas;
      base.duplaMultiplicacaoCorrigida = true;
    } else {
      armacao = horas * TAXA_ARMACAO_PADRAO;
      base.taxaArmacao = TAXA_ARMACAO_PADRAO;
      base.armacaoEstimada = true;
      base.alertas.push(
        "Horas de armação lançadas sem custo correspondente na planilha. Aplicada a taxa do setor de armação (R$/hora do Robô).",
      );
    }
  }

  const setor = horaProduto * horaSetor;
  const valor = setor + central + armacao + pintura;
  base.componentes = { setor, central, armacao, pintura };
  base.valor = valor;
  base.diferenca = original === null ? null : valor - original;
  if (base.duplaMultiplicacaoCorrigida) {
    base.alertas.push(
      "Custo de armação recalculado como Horas × Taxa (a planilha multiplicava pelas horas duas vezes).",
    );
  }
  return base;
}

/** Quantos produtos são afetados por cada correção do Centro de Custos. */
export function resumoCentroCustos() {
  const linhas = centroCustos.roteiro.map((r) => producaoCorrigida(r.produto));
  return {
    total: linhas.length,
    duplaMultiplicacao: linhas.filter((l) => l.duplaMultiplicacaoCorrigida).length,
    armacaoEstimada: linhas.filter((l) => l.armacaoEstimada).length,
    referenciaQuebrada: linhas.filter((l) => l.referenciaQuebrada).length,
    impactoMedio: (() => {
      const difs = linhas.map((l) => l.diferenca).filter(isNum);
      return difs.length ? difs.reduce((a, b) => a + b, 0) / difs.length : 0;
    })(),
  };
}

/* ------------------------------------------------------------------ *
 * 2. Tributário — Simples Nacional (cenário "Material Via Tonial")
 *
 * Planilha:  aplicava a alíquota nominal da faixa (10%).
 * Sistema :  alíquota efetiva = (RBT12 × alíquota nominal − parcela a deduzir) ÷ RBT12.
 * ------------------------------------------------------------------ */

export type SimplesCalculado = {
  rbt12: number;
  faixa: { de: number | null; ate: number | null; aliquota: number | null; deduzir: number | null } | null;
  aliquotaNominal: number | null;
  valorDeduzir: number | null;
  aliquotaEfetiva: number | null;
};

export function simplesEfetivo(rbt12 = impostos.tonial.faturamento12m ?? 0): SimplesCalculado {
  const faixa =
    impostos.tonial.faixas.find(
      (f) => rbt12 >= (f.de ?? 0) && rbt12 <= (f.ate ?? Number.POSITIVE_INFINITY),
    ) ?? null;
  const nominal = faixa && isNum(faixa.aliquota) ? faixa.aliquota : null;
  const deduzir = faixa && isNum(faixa.deduzir) ? faixa.deduzir : 0;
  const efetiva = nominal !== null && rbt12 > 0 ? (rbt12 * nominal - deduzir) / rbt12 : null;
  return {
    rbt12,
    faixa,
    aliquotaNominal: nominal,
    valorDeduzir: deduzir,
    aliquotaEfetiva: efetiva === null ? null : Math.max(efetiva, 0),
  };
}

export const simplesVigente = simplesEfetivo();

/* ------------------------------------------------------------------ *
 * 3. Insumos e BOM
 *
 * Planilha:  IFERROR(VLOOKUP(...);1000) — insumo ausente virava custo de R$ 1.000.
 * Sistema :  insumo ausente ou com custo zero gera alerta e bloqueia o preço;
 *            todo custo total é recalculado como Quantidade × Custo unitário.
 * ------------------------------------------------------------------ */

const insumoPorFull = new Map(insumos.map((i) => [i.full, i]));

export type ProblemaItem = "sem-cadastro" | "custo-zero" | "sem-quantidade" | "sobrescrito";

export type ItemCusteado = {
  item: string;
  tipo: string;
  quantidade: number | null;
  unidade: string | null;
  custoUnitario: number | null;
  custoTotal: number | null;
  custoTotalPlanilha: number | null;
  problemas: ProblemaItem[];
  demonstrativo?: boolean;
};

/** Custo unitário oficial: cadastro de insumos ou, para semiacabados, o custo de MP do produto. */
export function custoUnitarioOficial(item: string, tipo?: string): number | null {
  const cadastro = insumoPorFull.get(item);
  if (cadastro && isNum(cadastro.custoUnitario)) return cadastro.custoUnitario;
  if (cadastro) return null;
  const semiacabado = mpTotais[item];
  if (isNum(semiacabado)) return semiacabado;
  if (tipo === "Produto Acabado") return null;
  return null;
}

export function custearItem(l: {
  item: string;
  tipo: string;
  quantidade: number | null;
  unidade: string | null;
  custoUnitario: number | null;
  custoTotal: number | null;
  demonstrativo?: boolean;
}): ItemCusteado {
  const problemas: ProblemaItem[] = [];
  const oficial = custoUnitarioOficial(l.item, l.tipo);
  const unitario = oficial ?? (isNum(l.custoUnitario) ? l.custoUnitario : null);

  if (unitario === null) problemas.push("sem-cadastro");
  else if (unitario === 0) problemas.push("custo-zero");
  if (!isNum(l.quantidade)) problemas.push("sem-quantidade");

  const total =
    unitario !== null && isNum(l.quantidade) ? unitario * l.quantidade : null;
  if (
    total !== null &&
    isNum(l.custoTotal) &&
    Math.abs(total - l.custoTotal) > 0.01 &&
    !problemas.length
  ) {
    problemas.push("sobrescrito");
  }

  const base: ItemCusteado = {
    item: l.item,
    tipo: l.tipo,
    quantidade: l.quantidade,
    unidade: l.unidade,
    custoUnitario: unitario,
    custoTotal: total,
    custoTotalPlanilha: l.custoTotal,
    problemas,
  };
  if (l.demonstrativo) base.demonstrativo = true;
  return base;
}

export function descricaoProblema(p: ProblemaItem): string {
  switch (p) {
    case "sem-cadastro":
      return "Insumo sem custo cadastrado — antes a planilha assumia R$ 1.000 em silêncio. O preço fica bloqueado.";
    case "custo-zero":
      return "Insumo com custo zero: o material está sendo precificado de graça. Atualize o cadastro.";
    case "sem-quantidade":
      return "Componente sem quantidade informada na estrutura.";
    case "sobrescrito":
      return "Custo total estava digitado por cima na planilha; agora é recalculado como Quantidade × Custo unitário.";
  }
}

/** Itens de estrutura que dependiam do valor fictício de R$ 1.000 ou estão a custo zero. */
export function itensCriticosBom() {
  return bom
    .slice(1)
    .map((l) => ({ produto: l.produto, ...custearItem(l) }))
    .filter((i) => i.problemas.some((p) => p === "sem-cadastro" || p === "custo-zero"));
}

export function itensSobrescritos() {
  return bom
    .slice(1)
    .map((l) => ({ produto: l.produto, ...custearItem(l) }))
    .filter((i) => i.problemas.includes("sobrescrito"));
}

/* ------------------------------------------------------------------ *
 * 4. Despesas operacionais
 *
 * Planilha:  média simples de dez razões mensais (Despesas!E107).
 * Sistema :  taxa agregada ponderada = Σ despesas ÷ Σ receita dos meses fechados.
 * ------------------------------------------------------------------ */

function rodapePor(nome: string, fonte: typeof despesas = despesas): (number | null)[] {
  return fonte.rodape.find((r) => r.nome.toLowerCase().startsWith(nome))?.valores ?? [];
}

export function despesasPonderadas(fonte: typeof despesas = despesas) {
  const totais = rodapePor("total depesas por mês", fonte);
  const receita = rodapePor("faturamento por mês", fonte);
  let somaDespesas = 0;
  let somaReceita = 0;
  let meses = 0;
  receita.forEach((rec, i) => {
    const desp = totais[i];
    if (isNum(rec) && rec > 0 && isNum(desp) && desp > 0) {
      somaReceita += rec;
      somaDespesas += desp;
      meses += 1;
    }
  });
  const ponderada = somaReceita > 0 ? somaDespesas / somaReceita : null;
  return {
    somaDespesas,
    somaReceita,
    meses,
    ponderada,
    mediaSimples: despesas.mediaDespesas,
    diferenca: ponderada === null ? null : ponderada - despesas.mediaDespesas,
  };
}

export const despesasVigentes = despesasPonderadas();

/** Percentual de despesas que o motor de preço passa a usar. */
export const DESPESAS_PERCENTUAL =
  despesasVigentes.ponderada ?? despesas.mediaDespesas;

/* ------------------------------------------------------------------ *
 * 5. Logística e frota
 *
 * Planilha:  rótulo "Consumo Diesel/Km" = 2,69 usado como divisor de R$/L.
 * Sistema :  rendimento médio = 2,69 km/L; R$/km = R$/L ÷ km/L + manutenção/km.
 * ------------------------------------------------------------------ */

function variavel(prefixo: string): number | null {
  const v = logistica.variaveis.find((x) =>
    x.item.toLowerCase().startsWith(prefixo.toLowerCase()),
  );
  return v && isNum(v.valor) ? v.valor : null;
}

export function logisticaCorrigida() {
  const precoDiesel = variavel("valor diesel") ?? 0;
  const rendimentoKmPorLitro = variavel("consumo diesel") ?? 1;
  const manutencaoMes = variavel("manutenção") ?? 0;
  const km = isNum(logistica.kmRodadosMes) && logistica.kmRodadosMes > 0 ? logistica.kmRodadosMes : 1;

  const dieselPorKm = rendimentoKmPorLitro > 0 ? precoDiesel / rendimentoKmPorLitro : 0;
  const manutencaoPorKm = manutencaoMes / km;
  const variavelPorKm = dieselPorKm + manutencaoPorKm;
  const fixoPorKm = logistica.totalFixos / km;

  return {
    precoDiesel,
    rendimentoKmPorLitro,
    manutencaoMes,
    kmRodadosMes: km,
    dieselPorKm,
    manutencaoPorKm,
    variavelPorKm,
    fixoPorKm,
    custoTotalPorKm: variavelPorKm + fixoPorKm,
    consistente: Math.abs(variavelPorKm + fixoPorKm - logistica.custoTotalPorKm) < 0.01,
  };
}

export const frota = logisticaCorrigida();

/** Frete por peça: (km ÷ peças) × R$/km × fator de ida e volta. */
export function fretePorPeca(km: number, pecas: number, fator: number): number {
  if (!(pecas > 0) || !(km > 0)) return 0;
  return (km / pecas) * frota.custoTotalPorKm * fator;
}

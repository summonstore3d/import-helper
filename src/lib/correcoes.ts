/**
 * Correções aplicadas ao modelo herdado da planilha, conforme a auditoria de 28.08.2026.
 *
 * Cada bloco abaixo documenta a fórmula original da planilha, o problema apontado
 * pela auditoria e a regra que passa a valer no sistema.
 */
import { bom, centroCustos, despesas, guiaCdc, impostos, insumos, logistica, mpTotais, parametros, type Insumo, type RoteiroLinha, type Setor } from "@/data";
import {
  custoCentral,
  HORAS_PINTURA,
  setoresCalculados,
  taxaDoSetor,
  taxaHora,
  type BaseIndustrial,
} from "./custos-industriais";
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

export function roteiroDe(produto: string, roteiro: RoteiroLinha[] = centroCustos.roteiro) {
  return roteiro.find((r) => r.produto === produto) ?? null;
}

const baseEstatica: BaseIndustrial = { setores: centroCustos.setores, roteiro: centroCustos.roteiro, guia: guiaCdc };
let setoresEstaticos: Setor[] | null = null;
const cacheSetores = new WeakMap<BaseIndustrial, Setor[]>();

/** Setores com $/hora recalculado a partir do rateio de mão de obra e manutenção. */
export function setoresVigentes(base?: BaseIndustrial): Setor[] {
  if (!base) return (setoresEstaticos ??= setoresCalculados(baseEstatica));
  let s = cacheSetores.get(base);
  if (!s) {
    s = setoresCalculados(base);
    cacheSetores.set(base, s);
  }
  return s;
}

/**
 * Custo de produção recalculado a partir da base editável:
 *   Setor × horas + Central (kg) + Armação (horas × $/h Robô) + Pintura (0,16 h × $/h Pintura)
 */
export function producaoCorrigida(produto: string, base?: BaseIndustrial): ProducaoCorrigida {
  const r = roteiroDe(produto, base?.roteiro);
  const setores = setoresVigentes(base);
  const out: ProducaoCorrigida = {
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
    out.alertas.push("Produto sem roteiro de produção no Centro de Custos.");
    return out;
  }
  const original = isNum(r.custoProducao) ? r.custoProducao : null;
  out.original = original;

  const horaProduto = isNum(r.horaProduto) ? r.horaProduto : null;
  const horaSetor = taxaDoSetor(setores, r.setor);
  const horas = isNum(r.horaArmacao) ? r.horaArmacao : 0;
  out.horasArmacao = horas;

  if (horaProduto === null || horaSetor === null) {
    out.referenciaQuebrada = true;
    out.alertas.push(
      "Referência quebrada no Centro de Custos (setor ou hora do produto inválidos). O preço fica bloqueado até a correção.",
    );
    return out;
  }

  const central = custoCentral(isNum(r.kgPorProduto) ? r.kgPorProduto : null, setores) ?? (isNum(r.central) ? r.central : 0);
  const taxaPintura = taxaHora(setores, "Pintura") ?? 0;
  const pintura = isNum(r.pintura) && r.pintura > 0 ? HORAS_PINTURA * taxaPintura : 0;
  const taxaArmacao = taxaHora(setores, "Robô") ?? TAXA_ARMACAO_PADRAO;

  let armacao = 0;
  if (horas > 0) {
    armacao = horas * taxaArmacao;
    out.taxaArmacao = taxaArmacao;
    if (isNum(r.custoArmacao) && r.custoArmacao > 0) {
      out.duplaMultiplicacaoCorrigida = true;
      out.alertas.push(
        "Custo de armação recalculado como Horas × Taxa (a planilha multiplicava pelas horas duas vezes).",
      );
    } else {
      out.armacaoEstimada = true;
      out.alertas.push(
        "Horas de armação lançadas sem custo correspondente na planilha. Aplicada a taxa do setor de armação (R$/hora do Robô).",
      );
    }
  }

  const setor = horaProduto * horaSetor;
  const valor = setor + central + armacao + pintura;
  out.componentes = { setor, central, armacao, pintura };
  out.valor = valor;
  out.diferenca = original === null ? null : valor - original;
  return out;
}

/** Quantos produtos são afetados por cada correção do Centro de Custos. */
export function resumoCentroCustos(base?: BaseIndustrial) {
  const linhas = (base?.roteiro ?? centroCustos.roteiro).map((r) => producaoCorrigida(r.produto, base));
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
export type FontesCusto = {
  /** Cadastro de insumos vigente (editado pelo usuário). */
  insumos?: Map<string, Insumo>;
  /** Custo de MP de um semiacabado calculado pela estrutura vigente. */
  semiacabado?: (item: string) => number | null;
};

export function mapaInsumos(lista: Insumo[]): Map<string, Insumo> {
  return new Map(lista.map((i) => [i.full, i]));
}

export function custoUnitarioOficial(item: string, tipo?: string, fontes?: FontesCusto): number | null {
  const cadastro = (fontes?.insumos ?? insumoPorFull).get(item);
  if (cadastro && isNum(cadastro.custoUnitario)) return cadastro.custoUnitario;
  if (cadastro) return null;
  const vivo = fontes?.semiacabado?.(item);
  if (isNum(vivo)) return vivo;
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
}, fontes?: FontesCusto): ItemCusteado {
  const problemas: ProblemaItem[] = [];
  const oficial = custoUnitarioOficial(l.item, l.tipo, fontes);
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

/** Contas de logística/frota que já entram no cálculo do frete e por isso saem do % de despesas. */
export const CONTAS_DO_FRETE = new Set([
  "COMBUSTIVEIS VEICULOS FABRICA",
  "DESPESAS COM CAMINHOES",
  "PEDAGIOS",
  "IPVA",
  "SEGUROS",
]);

const normalizarConta = (valor: string) =>
  valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();

export function ehContaDoFrete(nome: string) {
  return CONTAS_DO_FRETE.has(normalizarConta(nome));
}

/**
 * Totais por mês calculados a partir das contas (nunca dos totais guardados da planilha).
 * Total de despesas = VAR (007) + PES (009) + OP (010); o CMV (005) é custo de mercadoria, não despesa.
 */
export function totaisPorMes(fonte: typeof despesas = despesas) {
  const n = fonte.meses.length;
  const porGrupo = new Map<string, number[]>();
  let atual: number[] | null = null;
  for (const linha of fonte.linhas) {
    if (linha.tipo === "grupo") {
      atual = Array.from({ length: n }, () => 0);
      porGrupo.set(linha.nome, atual);
      continue;
    }
    if (!atual) continue;
    linha.valores.forEach((v, i) => {
      if (i < n && isNum(v.valor)) atual![i]! += v.valor;
    });
  }
  const buscar = (prefixo: string) =>
    [...porGrupo.entries()].find(([nome]) => nome.includes(prefixo))?.[1] ??
    Array.from({ length: n }, () => 0);
  const cmv = buscar("005");
  const variaveis = buscar("007");
  const pessoal = buscar("009");
  const operacionais = buscar("010");
  const total = variaveis.map((v, i) => v + pessoal[i]! + operacionais[i]!);
  return { porGrupo, cmv, variaveis, pessoal, operacionais, total };
}

export function despesasPonderadas(fonte: typeof despesas = despesas) {
  const totais = totaisPorMes(fonte).total;
  const receita = rodapePor("faturamento por mês", fonte);
  const linhasDoFrete = fonte.linhas.filter((linha) => ehContaDoFrete(linha.nome));
  let somaDespesas = 0;
  let somaReceita = 0;
  let meses = 0;
  const taxasMensais: number[] = [];
  const taxasPorMes: (number | null)[] = receita.map(() => null);
  receita.forEach((rec, i) => {
    const desp = totais[i];
    if (isNum(rec) && rec > 0 && isNum(desp) && desp > 0) {
      const despesasJaNoFrete = linhasDoFrete.reduce(
        (total, linha) => total + (isNum(linha.valores[i]?.valor) ? linha.valores[i].valor : 0),
        0,
      );
      const despesaAjustada = desp - despesasJaNoFrete;
      somaReceita += rec;
      somaDespesas += despesaAjustada;
      taxasMensais.push(despesaAjustada / rec);
      taxasPorMes[i] = despesaAjustada / rec;
      meses += 1;
    }
  });
  const ponderada = somaReceita > 0 ? somaDespesas / somaReceita : null;
  const mediaSimples = taxasMensais.length
    ? taxasMensais.reduce((total, taxa) => total + taxa, 0) / taxasMensais.length
    : fonte.mediaDespesas;
  return {
    somaDespesas,
    somaReceita,
    meses,
    ponderada,
    mediaSimples,
    taxasPorMes,
    diferenca: ponderada === null ? null : ponderada - mediaSimples,
  };
}

export const despesasVigentes = despesasPonderadas();

/** Percentual de despesas que o motor de preço passa a usar. */
export const DESPESAS_PERCENTUAL =
  parametros.despesasPercentual;

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

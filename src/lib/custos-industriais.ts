/**
 * Cadeia de custo industrial recalculada a partir dos dados editáveis
 * (mesma lógica das abas "Guia - CDC" e "Centro de Custos" da planilha):
 *
 *   Mão de obra do setor  = colaboradores rateados no setor × salário médio MOD
 *   Manutenção do setor   = Total × % (rateio de manutenção)
 *   $ Mês                 = Mão de obra + Manutenção
 *   $/Hora ideal          = ($ Mês + Acabamento + Transporte interno + $/Hora ponte) ÷ Horas disponíveis
 *   $/Hora real           = $/Hora ideal ÷ Eficiência
 *   $/Hora do produto     = setor "Chão" → média de Tampa, Anéis e Galerias; demais → $/Hora real do setor
 */
import { salarios, type GuiaCdc, type RoteiroLinha, type Setor } from "@/data";
import { isNum } from "./format";

export type BaseIndustrial = { setores: Setor[]; roteiro: RoteiroLinha[]; guia: GuiaCdc };

export const SALARIO_MEDIO_MOD =
  salarios.categorias.find((c) => c.categoria === "MOD")?.salarioMedio ?? 0;

/** Coluna do rateio de mão de obra que alimenta cada setor do Centro de Custos. */
const COLUNA_MAO_DE_OBRA: Record<string, string | null> = {
  Central: "Mistura",
  Pintura: null, // a coluna Pintura não faz parte do rateio importado; mantém o valor do setor
  Robô: "Robô",
  Manual: "Galeria/Gradil",
};

/** Linha do rateio de manutenção usada por setor (e divisor). */
const MANUTENCAO_POR_SETOR: Record<string, { linha: string; divisor: number } | "zero"> = {
  Robô: "zero",
  Siome: { linha: "Siome", divisor: 1 },
  Radial: { linha: "Radial", divisor: 1 },
  PH: { linha: "PH", divisor: 1 },
  Tampa: { linha: "Chão", divisor: 3 },
  Anéis: { linha: "Chão", divisor: 3 },
  Galerias: { linha: "Chão", divisor: 3 },
  Vibromatic: { linha: "Vibromatic", divisor: 1 },
};

const SETORES_CHAO = ["Tampa", "Anéis", "Galerias"];
const num = (v: unknown) => (isNum(v) ? v : 0);

export function colaboradoresPorSetor(guia: GuiaCdc): Record<string, number> {
  const total: Record<string, number> = {};
  for (const f of guia.maoDeObra) {
    if (f.funcao.trim().toLowerCase().startsWith("total")) continue;
    for (const [setor, v] of Object.entries(f.valores)) total[setor] = (total[setor] ?? 0) + num(v);
  }
  return total;
}

export function manutencaoDaLinha(guia: GuiaCdc, linha: string): number {
  const m = guia.manutencao.find((x) => x.setor.trim() === linha);
  return m ? num(m.total) * num(m.percentual) : 0;
}

export function setoresCalculados(base: BaseIndustrial, salario = SALARIO_MEDIO_MOD): Setor[] {
  const pessoas = colaboradoresPorSetor(base.guia);
  return base.setores.map((s) => {
    const coluna = s.nome in COLUNA_MAO_DE_OBRA ? COLUNA_MAO_DE_OBRA[s.nome] : s.nome;
    const maoDeObra =
      coluna && pessoas[coluna] !== undefined ? pessoas[coluna] * salario : s.maoDeObra;
    const regra = MANUTENCAO_POR_SETOR[s.nome];
    const manutencao =
      regra === "zero" ? 0 : regra ? manutencaoDaLinha(base.guia, regra.linha) / regra.divisor : s.manutencao;
    const valido = isNum(maoDeObra) && (manutencao === null || isNum(manutencao));
    const mesTotal = valido ? num(maoDeObra) + num(manutencao) : "#REF!";
    const horas = num(s.horasDisponiveis);
    const eficiencia = num(s.eficienciaPerdida);
    const numerador = valido
      ? num(mesTotal) + num(s.acabamento) + num(s.transporteInterno) + num(s.horaPonte)
      : null;
    const horaIdeal = numerador !== null && horas > 0 ? numerador / horas : "#REF!";
    const horaReal = isNum(horaIdeal) && eficiencia > 0 ? horaIdeal / eficiencia : "#REF!";
    return { ...s, maoDeObra, manutencao, mesTotal, horaIdeal, horaReal } as Setor;
  });
}

export function taxaHora(setores: Setor[], nome: string): number | null {
  const s = setores.find((x) => x.nome === nome);
  return s && isNum(s.horaReal) ? s.horaReal : null;
}

/** $/Hora usada pelo roteiro do produto. */
export function taxaDoSetor(setores: Setor[], setor: string | null): number | null {
  if (!setor) return null;
  if (setor === "Chão") {
    const taxas = SETORES_CHAO.map((n) => taxaHora(setores, n));
    if (taxas.some((t) => t === null)) return null;
    return (taxas as number[]).reduce((a, b) => a + b, 0) / taxas.length;
  }
  return taxaHora(setores, setor);
}

/** Central: (kg ÷ 15 kg/s ÷ 3600) × $/Hora real da Central. */
export function custoCentral(kg: number | null, setores: Setor[]): number | null {
  const taxa = taxaHora(setores, "Central");
  if (!isNum(kg) || taxa === null) return null;
  return (kg / 15 / 3600) * taxa;
}

/** Pintura: 0,16 h × $/Hora real da Pintura, para produtos impermeabilizados. */
export const HORAS_PINTURA = 0.16;

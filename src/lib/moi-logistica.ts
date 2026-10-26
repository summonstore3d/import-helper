import type { Despesas } from "@/data";

export const MOI_LOGISTICA = "MOI logística";
export const MEDIA_MOI_LOGISTICA = 36_000;
const normalizar = (nome: string) => nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
export const ehMoiLogistica = (nome: string) => normalizar(nome) === "MOILOGISTICA";
export const ehSalarioMoi = (nome: string) => ["SALARIOMOIMAODEOBRAINDIRETA", "SALARIOLIQUIDOMAODEOBRAINDIRETA"].includes(normalizar(nome));

/** Splits only unsplit data; the synthetic row is the durable marker. */
export function separarMoiLogistica(base: Despesas): Despesas {
  if (base.linhas.some((l) => ehMoiLogistica(l.nome))) return base;
  const indice = base.linhas.findIndex((l) => l.tipo === "conta" && ehSalarioMoi(l.nome));
  if (indice < 0) return base;
  const novo = structuredClone(base);
  const moi = novo.linhas[indice];
  if (!moi) return base;
  const receita = novo.rodape.find((r) => r.nome.toLowerCase().includes("faturamento"))?.valores ?? [];
  const valores = moi.valores.map((v, i) => {
    if (v.valor === null) return { valor: null, percentual: null };
    v.valor -= MEDIA_MOI_LOGISTICA;
    const fat = receita[i];
    v.percentual = typeof fat === "number" && fat > 0 ? v.valor / fat : null;
    return { valor: MEDIA_MOI_LOGISTICA, percentual: typeof fat === "number" && fat > 0 ? MEDIA_MOI_LOGISTICA / fat : null };
  });
  novo.linhas.splice(indice + 1, 0, { nome: MOI_LOGISTICA, tipo: "conta", valores });
  return novo;
}
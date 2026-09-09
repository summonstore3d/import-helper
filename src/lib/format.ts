const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

const brlPreciso = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 5,
});

const numero = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });

export const REF_INCONSISTENTE = "Referência inconsistente";

export function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export function money(v: unknown): string {
  return isNum(v) ? brl.format(v) : REF_INCONSISTENTE;
}

export function moneyPreciso(v: unknown): string {
  return isNum(v) ? brlPreciso.format(v) : REF_INCONSISTENTE;
}

export function pct(v: unknown, dec = 2): string {
  if (!isNum(v)) return REF_INCONSISTENTE;
  return `${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(v * 100)}%`;
}

export function qtd(v: unknown): string {
  return isNum(v) ? numero.format(v) : REF_INCONSISTENTE;
}

export function dataBR(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR");
}

export function dataHoraBR(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

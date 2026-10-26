import { codigoMargem } from "./margens";

export const TETO_DESCONTO = 0.10;
export const DESCONTO_INICIAL = 0;
export type TetosDesconto = Record<string, number>;
export const tetoValido = (teto: number) => Number.isFinite(teto) && teto >= 0 && teto <= TETO_DESCONTO;
export function tetoDoProduto(produto: string, tetos: TetosDesconto) {
  const teto = tetos[codigoMargem(produto)];
  return typeof teto === "number" && tetoValido(teto) ? teto : TETO_DESCONTO;
}
export function lerTetos(rows: { domain: string; payload: unknown }[]): TetosDesconto {
  const tetos: TetosDesconto = {};
  for (const row of rows) {
    if (!row.domain.startsWith("discount:") || !row.payload || typeof row.payload !== "object") continue;
    const teto = (row.payload as { cap?: unknown }).cap;
    if (typeof teto === "number" && tetoValido(teto)) tetos[row.domain.slice(9)] = teto;
  }
  return tetos;
}
export function limitarDesconto(desconto: number, teto: number) {
  return Math.min(tetoValido(teto) ? teto : TETO_DESCONTO, Math.max(0, Number.isFinite(desconto) ? desconto : 0));
}
export function precoComDesconto(preco: number | null, desconto: number, teto: number) {
  return preco === null ? null : Math.round((preco * (1 - limitarDesconto(desconto, teto)) + Number.EPSILON) * 100) / 100;
}
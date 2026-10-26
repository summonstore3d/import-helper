import { parametros } from "@/data";

export type MargensProdutos = Record<string, number>;
export const codigoMargem = (produto: string) => produto.split(" - ")[0]?.trim() ?? produto;
export const margemValida = (margem: number) => Number.isFinite(margem) && margem >= 0 && margem < 1;
export function margemDoProduto(produto: string, margens: MargensProdutos) {
  const margem = margens[codigoMargem(produto)];
  return typeof margem === "number" && margemValida(margem) ? margem : parametros.margemPadrao;
}
export function lerMargens(rows: { domain: string; payload: unknown }[]): MargensProdutos {
  const margens: MargensProdutos = {};
  for (const row of rows) {
    if (!row.domain.startsWith("margin:") || !row.payload || typeof row.payload !== "object") continue;
    const margem = (row.payload as { margin?: unknown }).margin;
    if (typeof margem === "number" && margemValida(margem)) margens[row.domain.slice(7)] = margem;
  }
  return margens;
}
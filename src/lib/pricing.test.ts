import { describe, expect, it } from "vitest";
import { parametros } from "@/data";
import { DESPESAS_PERCENTUAL, fretePorPeca, logisticaCorrigida, simplesEfetivo } from "./correcoes";

 describe("regras oficiais de precificação", () => {
  it("usa 22,894826% de despesas ajustadas sem duplicar custos do frete", () => {
    expect(parametros.despesasPercentual).toBeCloseTo(0.22894826434794963, 12);
    expect(DESPESAS_PERCENTUAL).toBeCloseTo(0.22894826434794963, 12);
  });
  it("interpreta diesel como 2,69 km/L", () => {
    expect(logisticaCorrigida().rendimentoKmPorLitro).toBe(2.69);
  });
  it("calcula frete por peça com ida e volta", () => {
    expect(fretePorPeca(50, 4, 1.5)).toBeCloseTo(logisticaCorrigida().custoTotalPorKm * 18.75, 8);
  });
  it("calcula a alíquota efetiva do Simples pelo RBT12", () => {
    expect(simplesEfetivo(3_000_000, 0.14, 397_800)).toBeCloseTo((3_000_000 * 0.14 - 397_800) / 3_000_000, 12);
  });
});

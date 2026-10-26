import { describe, expect, it } from "vitest";
import { produtos } from "@/data";
import { margemDoProduto, margemValida, lerMargens } from "./margens";
import { bomDoProduto, calcularPreco, parametrosPadrao, precoRapido } from "./pricing";

describe("Margens individuais", () => {
  it("inicia todos os produtos em 25%", () => {
    expect(produtos.length).toBeGreaterThan(0);
    for (const produto of produtos) expect(margemDoProduto(produto.full, {})).toBe(0.25);
    expect(parametrosPadrao().margem).toBe(0.25);
  });
  it("altera somente a margem do produto escolhido e preserva zero", () => {
    const margens = lerMargens([{ domain: "margin:TB004", payload: { margin: 0.30 } }, { domain: "margin:TB005", payload: { margin: 0 } }]);
    expect(margemDoProduto("TB004 - TUBO", margens)).toBe(0.30);
    expect(margemDoProduto("TB005 - TUBO", margens)).toBe(0);
    expect(margemDoProduto("TB006 - TUBO", margens)).toBe(0.25);
  });
  it("usa a margem individual no preço rápido", () => {
    const produto = "TB004 - TUBO DN 300 X 2000 X 50 PBJE EA2";
    const p = parametrosPadrao();
    const expected = calcularPreco({ produto, cenario: "Venda Normal", itensMP: bomDoProduto(produto), ...p, margem: 0.30, frota: false });
    expect(expected.preco).not.toBeNull();
    expect(precoRapido(produto, "Venda Normal", { itensMP: bomDoProduto(produto), margem: 0.30 })).toBe(expected.preco);
    expect(precoRapido(produto)).not.toBe(expected.preco);
  });
  it("recusa percentuais inválidos", () => {
    expect(margemValida(-0.01)).toBe(false);
    expect(margemValida(1)).toBe(false);
    expect(margemValida(NaN)).toBe(false);
    expect(margemValida(0.25)).toBe(true);
  });
});
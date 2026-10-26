import { describe, expect, it } from "vitest";
import { produtos } from "@/data";
import { DESCONTO_INICIAL, lerTetos, limitarDesconto, precoComDesconto, tetoDoProduto, tetoValido } from "./descontos";

describe("Desconto por produto", () => {
  it("começa em 0% e estabelece teto de 10% para todos", () => {
    expect(DESCONTO_INICIAL).toBe(0);
    expect(produtos.length).toBeGreaterThan(0);
    for (const p of produtos) expect(tetoDoProduto(p.full, {})).toBe(0.10);
  });
  it("aplica desconto ao preço final e arredonda em centavos", () => {
    expect(precoComDesconto(295.54, 0, 0.10)).toBe(295.54);
    expect(precoComDesconto(295.54, 0.10, 0.10)).toBe(265.99);
    expect(precoComDesconto(295.54, 0.05, 0.10)).toBe(280.76);
    expect(precoComDesconto(null, 0.10, 0.10)).toBeNull();
  });
  it("nunca supera o teto, mesmo com entrada excessiva ou negativa", () => {
    expect(limitarDesconto(0.11, 0.10)).toBe(0.10);
    expect(limitarDesconto(-0.01, 0.10)).toBe(0);
    expect(limitarDesconto(0.10, 0.05)).toBe(0.05);
    expect(precoComDesconto(100, 0.90, 0.10)).toBe(90);
  });
  it("preserva o teto individual, incluindo zero, sem afetar outros itens", () => {
    const tetos = lerTetos([{ domain: "discount:TB004", payload: { cap: 0.05 } }, { domain: "discount:TB005", payload: { cap: 0 } }]);
    expect(tetoDoProduto("TB004 - TUBO", tetos)).toBe(0.05);
    expect(tetoDoProduto("TB005 - TUBO", tetos)).toBe(0);
    expect(tetoDoProduto("TB006 - TUBO", tetos)).toBe(0.10);
    expect(tetoValido(0.11)).toBe(false);
  });
});
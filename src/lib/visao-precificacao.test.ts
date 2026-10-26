import { describe, expect, it } from "vitest";
import { mostraDetalhesPrecificacao } from "./visao-precificacao";

describe("Visão da Precificação", () => {
  it("permite ao administrador ocultar e restaurar os detalhes", () => {
    expect(mostraDetalhesPrecificacao("admin", false)).toBe(true);
    expect(mostraDetalhesPrecificacao("admin", true)).toBe(false);
  });
  it("não permite que a alternância amplie o acesso de vendedores", () => {
    expect(mostraDetalhesPrecificacao("vendedor", false)).toBe(false);
    expect(mostraDetalhesPrecificacao("vendedor", true)).toBe(false);
    expect(mostraDetalhesPrecificacao(null, false)).toBe(false);
  });
  it("preserva os detalhes para gerentes", () => {
    expect(mostraDetalhesPrecificacao("gerente", false)).toBe(true);
    expect(mostraDetalhesPrecificacao("gerente", true)).toBe(true);
  });
});
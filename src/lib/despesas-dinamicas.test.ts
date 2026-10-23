import { describe, expect, it } from "vitest";
import type { Despesas } from "@/data";
import { despesasPonderadas } from "./correcoes";
import { aplicarMesDre, analisarMeses, lerAbaGeral } from "./importar-dre";

const base = (): Despesas => ({
  meses: ["JANEIRO/2026", "FEVEREIRO/2026"],
  linhas: [
    { nome: "007 - DESPESAS VARIÁVEIS", tipo: "grupo", valores: [100, 100].map((valor) => ({ valor, percentual: null })) },
    { nome: "CONSULTORIA", tipo: "conta", valores: [100, 100].map((valor) => ({ valor, percentual: null })) },
    { nome: "PEDÁGIOS", tipo: "conta", valores: [20, 20].map((valor) => ({ valor, percentual: null })) },
  ],
  rodape: [{ nome: "Faturamento por Mês:", valores: [1000, 1000] }],
  mediaDespesas: 0,
});

describe("despesas dinâmicas", () => {
  it("recalcula a taxa ponderada ao editar uma conta incluída", () => {
    const d = base();
    expect(despesasPonderadas(d).ponderada).toBe(0.1);
    const conta = d.linhas[1]?.valores[0];
    if (!conta) throw new Error("Conta ausente");
    conta.valor = 300;
    expect(despesasPonderadas(d).ponderada).toBe(0.2);
  });
  it("continua excluindo os pedágios mesmo após edição", () => {
    const d = base();
    const frete = d.linhas[2]?.valores[0];
    if (!frete) throw new Error("Conta ausente");
    frete.valor = 500;
    expect(despesasPonderadas(d).ponderada).toBe(0.1);
  });
  it("recalcula ao zerar todas as despesas sem remover o faturamento do mês", () => {
    const d = base();
    for (const l of d.linhas) for (const v of l.valores) v.valor = 0;
    expect(despesasPonderadas(d).ponderada).toBe(0);
    expect(despesasPonderadas(d).somaReceita).toBe(2000);
  });
  it("recalcula a taxa após reimportar um mês cadastrado", () => {
    const d = base();
    const mes = lerAbaGeral("JANEIRO - GERAL", [[null, "001 - RECEITA DE VENDAS", 1000], [null, "007 - DESPESAS VARIÁVEIS", 320], [null, "CONSULTORIA", 300], [null, "PEDÁGIOS", 20]]);
    const analise = analisarMeses(d, [mes], 2026)[0];
    if (!analise) throw new Error("Mês ausente");
    expect(despesasPonderadas(aplicarMesDre(d, analise).despesas).ponderada).toBe(0.2);
  });
});
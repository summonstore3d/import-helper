import { describe, expect, it } from "vitest";
import type { Despesas } from "@/data";
import { aplicarMesDre, analisarMeses, lerAbaGeral, ultimoNaoCadastrado } from "./importar-dre";

const base = (): Despesas => ({
  meses: ["OUTUBRO", "JANEIRO", "FEVEREIRO"],
  linhas: [
    { nome: "(-) 007 - DESPESAS VARIÁVEIS", tipo: "grupo", valores: [0, 0, 0].map(() => ({ valor: 1, percentual: null })) },
    { nome: "PEDÁGIOS", tipo: "conta", valores: [0, 0, 0].map(() => ({ valor: 1, percentual: null })) },
  ],
  rodape: [
    { nome: "Total despesas VAR por Mês:", valores: [1, 1, null] },
    { nome: "Total despesas PES por Mês:", valores: [0, 0, null] },
    { nome: "Faturamento por Mês:", valores: [100, 100, null] },
  ],
  mediaDespesas: 0,
});

const aba = (mes: string) =>
  lerAbaGeral(`${mes} - GERAL`, [
    ["GERAL", null, mes],
    [null, "001 - RECEITA DE VENDAS", 1000],
    [null, "002 - DEDUÇÕES", 100],
    [null, "DEVOLUÇÃO", 100],
    [null, "007 - DESPESAS VARIÁVEIS", 50],
    [null, "PEDÁGIOS", 50],
  ]);

describe("importação do DRE mensal", () => {
  it("mês já cadastrado no mesmo ano é ignorado; mês vazio é o último pendente", () => {
    const an = analisarMeses(base(), [aba("JANEIRO"), aba("FEVEREIRO")], 2026);
    expect(an.map((a) => a.situacao)).toEqual(["cadastrado", "vazio"]);
    expect(ultimoNaoCadastrado(an)?.dre.mes).toBe("FEVEREIRO");
  });

  it("mês do ano anterior é substituído pelo do ano atual", () => {
    const [a] = analisarMeses(base(), [aba("OUTUBRO")], 2026);
    expect(a?.situacao).toBe("substitui");
    const r = aplicarMesDre(base(), a!);
    expect(r.despesas.meses).toEqual(["JANEIRO", "FEVEREIRO", "OUTUBRO/2026"]);
    expect(r.despesas.meses).toHaveLength(3);
  });

  it("faturamento = receita − devoluções e contas vêm da seção correta", () => {
    const [a] = analisarMeses(base(), [aba("FEVEREIRO")], 2026);
    const r = aplicarMesDre(base(), a!);
    expect(r.despesas.rodape[2]?.valores[2]).toBe(900);
    expect(r.despesas.rodape[0]?.valores[2]).toBe(50);
    expect(r.despesas.linhas[1]?.valores[2]?.valor).toBe(50);
  });
});

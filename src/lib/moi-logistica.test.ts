import { describe, expect, it } from "vitest";
import type { Despesas } from "@/data";
import { separarMoiLogistica } from "./moi-logistica";
import { despesasPonderadas, totaisPorMes, ehContaDoFrete } from "./correcoes";
import { aplicarMesDre, analisarMeses, lerAbaGeral } from "./importar-dre";

const base = (): Despesas => ({ meses: ["JANEIRO/2026", "FEVEREIRO/2026"], linhas: [
  { nome: "009 - DESPESAS COM PESSOAL", tipo: "grupo", valores: [{valor:80000,percentual:null},{valor:90000,percentual:null}] },
  { nome: "SALÁRIO MOI (MÃO DE OBRA INDIRETA)", tipo: "conta", valores: [{valor:80000,percentual:null},{valor:90000,percentual:null}] },
], rodape: [{nome:"Faturamento por Mês:",valores:[1000000,1000000]}], mediaDespesas:0 });
describe("MOI logística", () => {
  it("separa R$ 36.000 em todos os meses preservando o total bruto", () => {
    const d = separarMoiLogistica(base());
    expect(d.linhas[1]?.valores.map(v=>v.valor)).toEqual([44000,54000]);
    expect(d.linhas[2]?.valores.map(v=>v.valor)).toEqual([36000,36000]);
    expect(totaisPorMes(d).total).toEqual([80000,90000]);
  });
  it("exclui a parcela logística da taxa ponderada", () => {
    const d = separarMoiLogistica(base());
    expect(ehContaDoFrete("MOI logística")).toBe(true);
    expect(despesasPonderadas(d).somaDespesas).toBe(98000);
    expect(despesasPonderadas(d).ponderada).toBe(0.049);
  });
  it("não desconta duas vezes nem ao reimportar", () => {
    const d = separarMoiLogistica(base());
    expect(separarMoiLogistica(d)).toEqual(d);
    const dre = lerAbaGeral("JANEIRO - GERAL", [[null,"001 - RECEITA DE VENDAS",1000000],[null,"009 - DESPESAS COM PESSOAL",80000],[null,"SALÁRIO LÍQUIDO (MÃO DE OBRA INDIRETA)",80000]]);
    const a = analisarMeses(d,[dre],2026)[0];
    if (!a) throw new Error("Mês ausente");
    const r = aplicarMesDre(d,a);
    expect(r.despesas.linhas[1]?.valores[0]?.valor).toBe(44000);
    expect(r.despesas.linhas[2]?.valores[0]?.valor).toBe(36000);
    expect(r.naoEncontradas).not.toContain("MOI logística");
    expect(aplicarMesDre(r.despesas,a).despesas).toEqual(r.despesas);
  });
});
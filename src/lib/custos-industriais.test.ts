import { describe, expect, it } from "vitest";
import { centroCustos, guiaCdc, insumos } from "@/data";
import { custearItem, mapaInsumos, producaoCorrigida } from "./correcoes";
import { setoresCalculados, taxaHora } from "./custos-industriais";

const base = { setores: centroCustos.setores, roteiro: centroCustos.roteiro, guia: guiaCdc };
const produto = "AN001 - ANEL DN 600 X 750 X 70 PBJE EA2";

describe("cadeia de custo industrial dinâmica", () => {
  it("reproduz o $/hora real da planilha a partir do rateio", () => {
    const s = setoresCalculados(base);
    expect(taxaHora(s, "Robô")).toBeCloseTo(69.80486915, 6);
    expect(taxaHora(s, "Siome")).toBeCloseTo(104.83958244, 6);
  });

  it("mudar colaboradores no rateio muda o custo de produção", () => {
    const antes = producaoCorrigida(produto, base).valor ?? 0;
    const guia = structuredClone(guiaCdc);
    guia.maoDeObra[4]!.valores["Tampa"] = 3; // Pedreiro em Tampa: 1 → 3
    const depois = producaoCorrigida(produto, { ...base, guia }).valor ?? 0;
    expect(depois).toBeGreaterThan(antes);
  });

  it("mudar o custo do insumo muda a matéria-prima", () => {
    const i = insumos.find((x) => typeof x.custoUnitario === "number")!;
    const lista = insumos.map((x) => (x.full === i.full ? { ...x, custoUnitario: 999 } : x));
    const item = custearItem(
      { item: i.full, tipo: "Insumo", quantidade: 2, unidade: null, custoUnitario: null, custoTotal: null },
      { insumos: mapaInsumos(lista) },
    );
    expect(item.custoTotal).toBe(1998);
  });
});

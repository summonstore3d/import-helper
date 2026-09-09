import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { bomDoProduto, cenarioSugerido, precoRapido, type Cenario, type ItemMP } from "@/lib/pricing";
import { custearItem } from "@/lib/correcoes";
import { parametros, produtos } from "@/data";

/** Componente incluído durante a demonstração, antes do custeio. */
export type ItemAdicionado = {
  item: string;
  tipo: string;
  quantidade: number | null;
  unidade: string | null;
  custoUnitario: number | null;
  custoTotal: number | null;
};

export type AuditoriaEntrada = {
  id: string;
  data: string;
  usuario: string;
  modulo: string;
  registro: string;
  campo: string;
  valorAnterior: string;
  valorNovo: string;
  motivo: string;
  origem: "Demonstração" | "Sessão de demonstração";
};

export type VersaoPreco = {
  id: string;
  produto: string;
  data: string;
  custo: number;
  margem: number;
  preco: number;
  cenario: string;
  status: "Vigente" | "Substituída" | "Simulação";
  origem: "Demonstrativo" | "Sessão de demonstração";
};

type Ctx = {
  itensBom: (produto: string) => ItemMP[];
  adicionarItemBom: (produto: string, item: ItemAdicionado) => void;
  removerItemAdicionado: (produto: string, item: string) => void;
  auditoria: AuditoriaEntrada[];
  registrarAuditoria: (e: Omit<AuditoriaEntrada, "id" | "data">) => void;
  historico: VersaoPreco[];
  registrarVersao: (v: Omit<VersaoPreco, "id" | "data" | "origem">) => void;
  usuario: string;
};

const PrototypeContext = createContext<Ctx | null>(null);

const USUARIO = "diretoria.demo";

function idAleatorio() {
  return Math.random().toString(36).slice(2, 10);
}

/** Histórico demonstrativo derivado dos preços reais calculados. */
function historicoInicial(): VersaoPreco[] {
  const base = [
    parametros.produtoExemplo,
    "AN001 - ANEL DN 600 X 750 X 70 PBJE EA2",
    "AN003 - ANEL DN 600 X 500 X 70 JE EA2 COM FUNDO",
    "AN017 - ANEL DN 1200 X 500 X 130 PBJE EA2",
    "CQ001 - CAIXA QUADRADA 400 X 400 X 400 MM",
  ].filter((p) => produtos.some((x) => x.full === p));

  const versoes: VersaoPreco[] = [];
  base.forEach((produto, idx) => {
    const cenario = cenarioSugerido(produto);
    const preco = precoRapido(produto, cenario);
    const custo = bomDoProduto(produto).reduce((s, l) => s + (l.custoTotal ?? 0), 0);
    if (preco === null) return;
    const marcos: { dias: number; margem: number; status: VersaoPreco["status"] }[] = [
      { dias: 0, margem: parametros.margemPadrao, status: "Vigente" },
      { dias: 45, margem: 0.13, status: "Substituída" },
      { dias: 110, margem: 0.12, status: "Substituída" },
    ];
    marcos.forEach((m, i) => {
      const data = new Date(2026, 7, 28);
      data.setDate(data.getDate() - m.dias);
      const fator = (1 - parametros.margemPadrao) / (1 - m.margem);
      versoes.push({
        id: `${idx}-${i}`,
        produto,
        data: data.toISOString(),
        custo: custo * (1 - i * 0.035),
        margem: m.margem,
        preco: preco * fator * (1 - i * 0.03),
        cenario,
        status: m.status,
        origem: "Demonstrativo",
      });
    });
  });
  return versoes;
}

function auditoriaInicial(): AuditoriaEntrada[] {
  const d = (dias: number, h: number) => {
    const data = new Date(2026, 7, 28, h, 12);
    data.setDate(data.getDate() - dias);
    return data.toISOString();
  };
  return [
    {
      id: "a1",
      data: d(0, 9),
      usuario: "controladoria",
      modulo: "Insumos",
      registro: "9902291 - CIMENTO CP5.46.02.26606",
      campo: "Custo unitário",
      valorAnterior: "R$ 0,8210",
      valorNovo: "R$ 0,8595",
      motivo: "Reajuste de fornecedor",
      origem: "Demonstração",
    },
    {
      id: "a2",
      data: d(3, 14),
      usuario: "engenharia",
      modulo: "Estruturas / BOM",
      registro: "AN001 - ANEL DN 600 X 750 X 70 PBJE EA2",
      campo: "Quantidade — 9900454 - AREIA RG.12463/15-10/302.26603",
      valorAnterior: "295 KG",
      valorNovo: "299 KG",
      motivo: "Revisão de traço",
      origem: "Demonstração",
    },
    {
      id: "a3",
      data: d(9, 10),
      usuario: "controladoria",
      modulo: "Precificação",
      registro: "Parâmetros gerais",
      campo: "Margem de lucro",
      valorAnterior: "13,00%",
      valorNovo: "15,00%",
      motivo: "Decisão comercial",
      origem: "Demonstração",
    },
    {
      id: "a4",
      data: d(14, 16),
      usuario: "logistica",
      modulo: "Logística",
      registro: "Variáveis",
      campo: "Valor Diesel (L)",
      valorAnterior: "R$ 6,19",
      valorNovo: "R$ 6,50",
      motivo: "Atualização de preço na bomba",
      origem: "Demonstração",
    },
    {
      id: "a5",
      data: d(21, 11),
      usuario: "rh",
      modulo: "Salários",
      registro: "MOD",
      campo: "Colaboradores",
      valorAnterior: "65",
      valorNovo: "67",
      motivo: "Admissões do mês",
      origem: "Demonstração",
    },
  ];
}

export function PrototypeProvider({ children }: { children: ReactNode }) {
  const [adicionados, setAdicionados] = useState<Record<string, ItemAdicionado[]>>({});
  const [auditoria, setAuditoria] = useState<AuditoriaEntrada[]>(() => auditoriaInicial());
  const [historico, setHistorico] = useState<VersaoPreco[]>(() => historicoInicial());

  const registrarAuditoria = useCallback((e: Omit<AuditoriaEntrada, "id" | "data">) => {
    setAuditoria((prev) => [
      { ...e, id: idAleatorio(), data: new Date().toISOString() },
      ...prev,
    ]);
  }, []);

  const itensBom = useCallback(
    (produto: string) => [
      ...bomDoProduto(produto),
      ...(adicionados[produto] ?? []).map((i) => custearItem({ ...i, demonstrativo: true })),
    ],
    [adicionados],
  );

  const adicionarItemBom = useCallback(
    (produto: string, item: ItemAdicionado) => {
      setAdicionados((prev) => ({ ...prev, [produto]: [...(prev[produto] ?? []), item] }));
      registrarAuditoria({
        usuario: USUARIO,
        modulo: "Estruturas / BOM",
        registro: produto,
        campo: `Novo componente — ${item.item}`,
        valorAnterior: "—",
        valorNovo: `${item.quantidade ?? 0} ${item.unidade ?? ""}`.trim(),
        motivo: "Inclusão feita durante a demonstração",
        origem: "Sessão de demonstração",
      });
    },
    [registrarAuditoria],
  );

  const removerItemAdicionado = useCallback(
    (produto: string, item: string) => {
      setAdicionados((prev) => ({
        ...prev,
        [produto]: (prev[produto] ?? []).filter((i) => i.item !== item),
      }));
      registrarAuditoria({
        usuario: USUARIO,
        modulo: "Estruturas / BOM",
        registro: produto,
        campo: `Componente removido — ${item}`,
        valorAnterior: "presente",
        valorNovo: "removido",
        motivo: "Ajuste feito durante a demonstração",
        origem: "Sessão de demonstração",
      });
    },
    [registrarAuditoria],
  );

  const registrarVersao = useCallback((v: Omit<VersaoPreco, "id" | "data" | "origem">) => {
    setHistorico((prev) => [
      { ...v, id: idAleatorio(), data: new Date().toISOString(), origem: "Sessão de demonstração" },
      ...prev,
    ]);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      itensBom,
      adicionarItemBom,
      removerItemAdicionado,
      auditoria,
      registrarAuditoria,
      historico,
      registrarVersao,
      usuario: USUARIO,
    }),
    [
      itensBom,
      adicionarItemBom,
      removerItemAdicionado,
      auditoria,
      registrarAuditoria,
      historico,
      registrarVersao,
    ],
  );

  return <PrototypeContext.Provider value={value}>{children}</PrototypeContext.Provider>;
}

export function usePrototype(): Ctx {
  const ctx = useContext(PrototypeContext);
  if (!ctx) throw new Error("usePrototype precisa estar dentro de PrototypeProvider");
  return ctx;
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Context,
} from "react";
import { bomDoProduto, type Cenario, type ItemMP } from "@/lib/pricing";
import { custearItem, despesasPonderadas, mapaInsumos, setoresVigentes, type FontesCusto } from "@/lib/correcoes";
import type { BaseIndustrial } from "@/lib/custos-industriais";
import {
  centroCustos as centroCustosBase,
  despesas as despesasBase,
  guiaCdc as guiaCdcBase,
  insumos as insumosBase,
  type Despesas,
  type GuiaCdc,
  type Insumo,
  type RoteiroLinha,
  type Setor,
} from "@/data";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { lerTetos, tetoDoProduto, tetoValido, type TetosDesconto } from "@/lib/descontos";
import { separarMoiLogistica } from "@/lib/moi-logistica";
import { codigoMargem, lerMargens, margemDoProduto, margemValida, type MargensProdutos } from "@/lib/margens";

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
  origem: "Sistema compartilhado";
};

export type VersaoPreco = {
  id: string;
  produto: string;
  data: string;
  custo: number;
  margem: number;
  preco: number;
  cenario: string;
  desconto?: number;
  precoOriginal?: number;
  quantidade?: number;
  status: "Vigente" | "Substituída" | "Simulação";
  origem: "Sistema compartilhado";
};

export type InsumoEntrada = { codigo: string; descricao: string; custoUnitario: number | null };
export type MetodoDespesas = "ponderado" | "media";
export type CentroCustosEditavel = { setores: Setor[]; roteiro: RoteiroLinha[] };

type AuditInput = Omit<AuditoriaEntrada, "id" | "data" | "origem" | "usuario"> & {
  usuario?: string;
  origem?: string;
};

type Ctx = {
  tetoDescontoProduto: (produto: string) => number;
  salvarTetoDesconto: (produto: string, teto: number) => Promise<void>;
  margemProduto: (produto: string) => number;
  salvarMargemProduto: (produto: string, margem: number) => Promise<void>;
  demonstrativo: Despesas;
  importarDemonstrativo: (novo: Despesas, arquivo: string) => Promise<Despesas>;
  adicionarMesDespesas: (competencia: string) => void;
  atualizarDespesa: (linha: number, mes: number, valor: number | null) => void;
  metodoDespesas: MetodoDespesas;
  definirMetodoDespesas: (m: MetodoDespesas) => void;
  despesasPercentual: number | null;
  comparativoDespesas: ReturnType<typeof despesasPonderadas>;
  listaInsumos: Insumo[];
  salvarInsumo: (entrada: InsumoEntrada, fullOriginal?: string) => void;
  importarInsumos: (entradas: InsumoEntrada[], arquivo: string) => { atualizados: number; novos: number };
  itensBom: (produto: string) => ItemMP[];
  adicionarItemBom: (produto: string, item: ItemAdicionado) => void;
  salvarItemBom: (produto: string, indice: number, item: ItemAdicionado) => void;
  removerItemBom: (produto: string, indice: number) => void;
  removerItemAdicionado: (produto: string, item: string) => void;
  centroCustos: CentroCustosEditavel;
  /** Base industrial vigente usada pelo motor de preço. */
  baseIndustrial: BaseIndustrial;
  /** Setores com mão de obra, manutenção e $/hora recalculados. */
  setoresCalculados: Setor[];
  guiaCdc: GuiaCdc;
  atualizarSetor: (indice: number, setor: Setor) => void;
  atualizarRoteiro: (indice: number, roteiro: RoteiroLinha) => void;
  atualizarMaoDeObra: (linha: number, setor: string, valor: number) => void;
  auditoria: AuditoriaEntrada[];
  registrarAuditoria: (e: AuditInput) => void;
  historico: VersaoPreco[];
  registrarVersao: (v: Omit<VersaoPreco, "id" | "data" | "origem">) => void;
  usuario: string;
  autenticado: boolean;
  sincronizando: boolean;
  gravacao: EstadoGravacao;
};

export type EstadoGravacao =
  | { estado: "ocioso" }
  | { estado: "salvando" }
  | { estado: "salvo"; em: string }
  | { estado: "erro"; mensagem: string };

// Mantém a mesma instância do contexto entre recargas a quente (HMR),
// evitando que provider e consumidores apontem para contextos diferentes.
const g = globalThis as typeof globalThis & { __prototypeCtx?: Context<Ctx | null> };
const PrototypeContext: Context<Ctx | null> =
  g.__prototypeCtx ?? (g.__prototypeCtx = createContext<Ctx | null>(null));

function normalizeItem(item: ItemMP): ItemAdicionado {
  return {
    item: item.item,
    tipo: item.tipo,
    quantidade: item.quantidade,
    unidade: item.unidade,
    custoUnitario: item.custoUnitario,
    custoTotal: item.custoTotal,
  };
}

export function PrototypeProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState("Visitante");
  const [userId, setUserId] = useState<string | null>(null);
  const [sincronizando, setSincronizando] = useState(true);
  const [demonstrativo, setDemonstrativo] = useState<Despesas>(() => separarMoiLogistica(despesasBase));
  const [metodoDespesas, setMetodoDespesas] = useState<MetodoDespesas>("ponderado");
  const [listaInsumos, setListaInsumos] = useState<Insumo[]>(insumosBase);
  const [bomEditado, setBomEditado] = useState<Record<string, ItemAdicionado[]>>({});
  const [centroCustos, setCentroCustos] = useState<CentroCustosEditavel>(centroCustosBase);
  const [guiaCdc, setGuiaCdc] = useState<GuiaCdc>(guiaCdcBase);
  const [auditoria, setAuditoria] = useState<AuditoriaEntrada[]>([]);
  const [historico, setHistorico] = useState<VersaoPreco[]>([]);
  const [tetos, setTetos] = useState<TetosDesconto>({});
  const [margens, setMargens] = useState<MargensProdutos>({});
  const [gravacao, setGravacao] = useState<EstadoGravacao>({ estado: "ocioso" });
  const loaded = useRef(false);

  const carregar = useCallback(async () => {
    const [{ data: auth }, { data: states }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("system_state").select("domain,payload"),
    ]);
    const user = auth.user;
    setUserId(user?.id ?? null);
    setUsuario(user?.email ?? "Visitante");
    const state = new Map((states ?? []).map((row) => [row.domain, row.payload]));
    setMargens(lerMargens(states ?? []));
    setTetos(lerTetos(states ?? []));
    const materials = state.get("materials");
    const bomState = state.get("bom");
    const costs = state.get("costCenters");
    const expenses = state.get("expenses");
    const settings = state.get("settings");
    if (Array.isArray(materials) && materials.length) setListaInsumos(materials as Insumo[]);
    if (bomState && typeof bomState === "object" && !Array.isArray(bomState)) setBomEditado(bomState as Record<string, ItemAdicionado[]>);
    if (costs && typeof costs === "object" && !Array.isArray(costs)) {
      const value = costs as { setores?: Setor[]; roteiro?: RoteiroLinha[]; guia?: GuiaCdc };
      if (value.setores?.length && value.roteiro?.length) setCentroCustos({ setores: value.setores, roteiro: value.roteiro });
      if (value.guia?.maoDeObra?.length) setGuiaCdc(value.guia);
    }
    if (expenses && typeof expenses === "object" && !Array.isArray(expenses)) {
      const value = expenses as Partial<Despesas>;
      if (value.meses?.length && value.linhas?.length && value.rodape) setDemonstrativo(separarMoiLogistica(value as Despesas));
    }
    if (settings && typeof settings === "object" && !Array.isArray(settings)) {
      const method = (settings as { expenseMethod?: string }).expenseMethod;
      if (method === "media" || method === "weighted") setMetodoDespesas(method === "media" ? "media" : "ponderado");
    }
    if (user) {
      const [{ data: audits }, { data: versions }] = await Promise.all([
        supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(300),
        supabase.from("price_simulations").select("*").order("created_at", { ascending: false }).limit(300),
      ]);
      setAuditoria((audits ?? []).map((a) => ({
        id: a.id,
        data: a.created_at,
        usuario: a.user_email ?? "Usuário",
        modulo: a.module,
        registro: a.record_label,
        campo: a.field_name,
        valorAnterior: a.previous_value,
        valorNovo: a.new_value,
        motivo: a.reason,
        origem: "Sistema compartilhado",
      })));
      setHistorico((versions ?? []).map((v) => ({
        id: v.id,
        produto: v.product,
        data: v.created_at,
        custo: Number(v.cost),
        margem: Number(v.margin),
        preco: Number(v.price),
        cenario: v.scenario,
        status: v.status as VersaoPreco["status"],
        origem: "Sistema compartilhado",
      })));
    }
    loaded.current = true;
    setSincronizando(false);
  }, []);

  useEffect(() => {
    void carregar();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") void carregar();
    });
    return () => data.subscription.unsubscribe();
  }, [carregar]);

  // Agrupa gravações rápidas (digitação) por domínio e informa o resultado.
  const pendentes = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const revisaoLocal = useRef(0);
  const dominiosEmGravacao = useRef(new Set<string>());

  // Atualiza outras sessões sem sobrescrever uma edição local ainda não salva.
  useEffect(() => {
    const atualizarDespesasCompartilhadas = async () => {
      if (!loaded.current || document.visibilityState !== "visible" || dominiosEmGravacao.current.size) return;
      const revisao = revisaoLocal.current;
      const { data, error } = await supabase.from("system_state").select("domain,payload").or("domain.in.(expenses,settings),domain.like.margin:*,domain.like.discount:*");
      if (error || revisao !== revisaoLocal.current || dominiosEmGravacao.current.size) return;
      setMargens(lerMargens(data ?? []));
      setTetos(lerTetos(data ?? []));
      for (const row of data ?? []) {
        if (!row.payload || typeof row.payload !== "object" || Array.isArray(row.payload)) continue;
        if (row.domain === "expenses") {
          const value = row.payload as Partial<Despesas>;
          if (value.meses?.length && value.linhas?.length && value.rodape) {
            const separado = separarMoiLogistica(value as Despesas);
            setDemonstrativo((anterior) => JSON.stringify(anterior) === JSON.stringify(separado) ? anterior : separado);
          }
        } else if (row.domain === "settings") {
          const method = (row.payload as { expenseMethod?: string }).expenseMethod;
          if (method === "media" || method === "weighted") setMetodoDespesas(method === "media" ? "media" : "ponderado");
        }
      }
    };
    const atualizar = () => { void atualizarDespesasCompartilhadas(); };
    window.addEventListener("focus", atualizar);
    document.addEventListener("visibilitychange", atualizar);
    const intervalo = window.setInterval(atualizar, 15000);
    return () => {
      window.removeEventListener("focus", atualizar);
      document.removeEventListener("visibilitychange", atualizar);
      window.clearInterval(intervalo);
    };
  }, []);

  const persistir = useCallback(async (domain: string, payload: unknown) => {
    if (!loaded.current || !userId) return;
    revisaoLocal.current += 1;
    dominiosEmGravacao.current.add(domain);
    setGravacao({ estado: "salvando" });
    const anterior = pendentes.current.get(domain);
    if (anterior) clearTimeout(anterior);
    pendentes.current.set(domain, setTimeout(() => {
      pendentes.current.delete(domain);
      void supabase
        .from("system_state")
        .upsert({ domain, payload: payload as Json, updated_by: userId })
        .then(({ error }) => {
          if (error) setGravacao({ estado: "erro", mensagem: "Não foi possível salvar a alteração. Verifique sua conexão e tente novamente." });
          else {
            if (!pendentes.current.has(domain)) dominiosEmGravacao.current.delete(domain);
            if (dominiosEmGravacao.current.size === 0) setGravacao({ estado: "salvo", em: new Date().toISOString() });
          }
        });
    }, 600));
  }, [userId]);

  const registrarAuditoria = useCallback((e: AuditInput) => {
    if (!userId) return;
    const local: AuditoriaEntrada = {
      id: crypto.randomUUID(),
      data: new Date().toISOString(),
      usuario,
      modulo: e.modulo,
      registro: e.registro,
      campo: e.campo,
      valorAnterior: e.valorAnterior,
      valorNovo: e.valorNovo,
      motivo: e.motivo,
      origem: "Sistema compartilhado",
    };
    setAuditoria((prev) => [local, ...prev]);
    void supabase.from("audit_log").insert({
      user_id: userId,
      user_email: usuario,
      module: e.modulo,
      record_label: e.registro,
      field_name: e.campo,
      previous_value: e.valorAnterior,
      new_value: e.valorNovo,
      reason: e.motivo,
    });
  }, [userId, usuario]);

  const margemProduto = useCallback((produto: string) => margemDoProduto(produto, margens), [margens]);
  const salvarMargemProduto = useCallback(async (produto: string, margem: number) => {
    if (!loaded.current || !userId) throw new Error("Entre na sua conta e aguarde o carregamento dos dados.");
    if (!margemValida(margem)) throw new Error("Informe uma margem entre 0% e menos de 100%.");
    const codigo = codigoMargem(produto);
    const domain = `margin:${codigo}`;
    const anterior = margemDoProduto(produto, margens);
    revisaoLocal.current += 1;
    dominiosEmGravacao.current.add(domain);
    setGravacao({ estado: "salvando" });
    try {
      const { error } = await supabase.from("system_state").upsert({ domain, payload: { margin: margem }, updated_by: userId });
      if (error) throw error;
      const { data, error: leituraErro } = await supabase.from("system_state").select("domain,payload").eq("domain", domain).single();
      if (leituraErro || !data || lerMargens([data])[codigo] !== margem) throw new Error("Não foi possível conferir a margem salva.");
      setMargens((prev) => ({ ...prev, [codigo]: margem }));
      registrarAuditoria({ modulo: "Precificação", registro: produto, campo: "Margem de lucro", valorAnterior: `${anterior * 100}%`, valorNovo: `${margem * 100}%`, motivo: "Margem individual do produto" });
      setGravacao({ estado: "salvo", em: new Date().toISOString() });
    } catch {
      const mensagem = "Não foi possível salvar a margem. Verifique sua conexão e seu acesso de gerente ou administrador.";
      setGravacao({ estado: "erro", mensagem });
      throw new Error(mensagem);
    } finally {
      dominiosEmGravacao.current.delete(domain);
    }
  }, [userId, margens, registrarAuditoria]);

  const tetoDescontoProduto = useCallback((produto: string) => tetoDoProduto(produto, tetos), [tetos]);
  const salvarTetoDesconto = useCallback(async (produto: string, teto: number) => {
    if (!loaded.current || !userId) throw new Error("Entre na sua conta e aguarde o carregamento dos dados.");
    if (!tetoValido(teto)) throw new Error("Informe um teto entre 0% e 10%.");
    const codigo = codigoMargem(produto);
    const domain = `discount:${codigo}`;
    const anterior = tetoDoProduto(produto, tetos);
    revisaoLocal.current += 1;
    dominiosEmGravacao.current.add(domain);
    setGravacao({ estado: "salvando" });
    try {
      const { error } = await supabase.from("system_state").upsert({ domain, payload: { cap: teto }, updated_by: userId });
      if (error) throw error;
      const { data, error: leituraErro } = await supabase.from("system_state").select("domain,payload").eq("domain", domain).single();
      if (leituraErro || !data || lerTetos([data])[codigo] !== teto) throw new Error("Não foi possível conferir o teto salvo.");
      setTetos((prev) => ({ ...prev, [codigo]: teto }));
      registrarAuditoria({ modulo: "Precificação", registro: produto, campo: "Teto de desconto", valorAnterior: `${anterior * 100}%`, valorNovo: `${teto * 100}%`, motivo: "Teto individual do produto" });
      setGravacao({ estado: "salvo", em: new Date().toISOString() });
    } catch {
      const mensagem = "Não foi possível salvar o teto. Verifique sua conexão e seu acesso de gerente ou administrador.";
      setGravacao({ estado: "erro", mensagem });
      throw new Error(mensagem);
    } finally {
      dominiosEmGravacao.current.delete(domain);
    }
  }, [userId, tetos, registrarAuditoria]);

  const importarDemonstrativo = useCallback(async (novo: Despesas, arquivo: string): Promise<Despesas> => {
    if (!loaded.current || !userId) throw new Error("Entre na sua conta e aguarde o carregamento dos dados antes de importar.");
    revisaoLocal.current += 1;
    dominiosEmGravacao.current.add("expenses");
    const anterior = pendentes.current.get("expenses");
    if (anterior) clearTimeout(anterior);
    pendentes.current.delete("expenses");
    setGravacao({ estado: "salvando" });
    try {
      const { error } = await supabase.from("system_state").upsert({ domain: "expenses", payload: novo as unknown as Json, updated_by: userId });
      if (error) throw error;
      const { data, error: leituraErro } = await supabase.from("system_state").select("payload").eq("domain", "expenses").single();
      if (leituraErro || !data?.payload || typeof data.payload !== "object" || Array.isArray(data.payload)) throw new Error("Falha ao conferir as despesas salvas.");
      const confirmado = data.payload as unknown as Despesas;
      if (!confirmado.meses?.length || !confirmado.linhas?.length || !confirmado.rodape) throw new Error("Não foi possível conferir o demonstrativo salvo.");
      setDemonstrativo(confirmado);
      dominiosEmGravacao.current.delete("expenses");
      setGravacao({ estado: "salvo", em: new Date().toISOString() });
      registrarAuditoria({ modulo: "Despesas", registro: "Demonstrativo mensal", campo: "Importação", valorAnterior: "Base anterior", valorNovo: arquivo, motivo: "Importação validada e sincronizada" });
      return confirmado;
    } catch {
      const mensagem = "Não foi possível confirmar a sincronização das despesas. Verifique sua conexão e tente novamente.";
      setGravacao({ estado: "erro", mensagem });
      throw new Error(mensagem);
    }
  }, [userId, registrarAuditoria]);

  const adicionarMesDespesas = useCallback((competencia: string) => {
    const mes = competencia.trim().toUpperCase();
    if (!mes || demonstrativo.meses.includes(mes)) return;
    const novo: Despesas = {
      ...demonstrativo,
      meses: [...demonstrativo.meses, mes],
      linhas: demonstrativo.linhas.map((l) => ({ ...l, valores: [...l.valores, { valor: null, percentual: null }] })),
      rodape: demonstrativo.rodape.map((r) => ({ ...r, valores: [...r.valores, null] })),
    };
    setDemonstrativo(novo);
    void persistir("expenses", novo);
    registrarAuditoria({ modulo: "Despesas", registro: mes, campo: "Nova competência", valorAnterior: "—", valorNovo: "Mês vazio", motivo: "Inclusão manual" });
  }, [demonstrativo, persistir, registrarAuditoria]);

  const atualizarDespesa = useCallback((linha: number, mes: number, valor: number | null) => {
    const novo = structuredClone(demonstrativo);
    const alvo = novo.linhas[linha]?.valores[mes];
    if (!alvo) return;
    const antes = alvo.valor;
    alvo.valor = valor;
    const receita = novo.rodape.find((r) => r.nome.toLowerCase().includes("faturamento"))?.valores[mes];
    alvo.percentual = typeof receita === "number" && receita !== 0 && valor !== null ? valor / receita : null;
    setDemonstrativo(novo);
    void persistir("expenses", novo);
    registrarAuditoria({ modulo: "Despesas", registro: novo.linhas[linha]?.nome ?? "Conta", campo: novo.meses[mes] ?? "Mês", valorAnterior: String(antes ?? "—"), valorNovo: String(valor ?? "—"), motivo: "Preenchimento manual" });
  }, [demonstrativo, persistir, registrarAuditoria]);

  const comparativoDespesas = useMemo(() => despesasPonderadas(demonstrativo), [demonstrativo]);
  const despesasPercentual = metodoDespesas === "media" ? comparativoDespesas.mediaSimples : (comparativoDespesas.ponderada ?? comparativoDespesas.mediaSimples);

  const definirMetodoDespesas = useCallback((m: MetodoDespesas) => {
    const anterior = metodoDespesas;
    setMetodoDespesas(m);
    void persistir("settings", { expenseMethod: m === "media" ? "media" : "weighted" });
    if (anterior !== m) registrarAuditoria({ modulo: "Despesas", registro: "Parâmetros", campo: "Método", valorAnterior: anterior, valorNovo: m, motivo: "Comparação de critérios" });
  }, [metodoDespesas, persistir, registrarAuditoria]);

  const salvarInsumo = useCallback((entrada: InsumoEntrada, fullOriginal?: string) => {
    const full = `${entrada.codigo} - ${entrada.descricao}`;
    const novo = { ...entrada, full };
    const anterior = listaInsumos.find((i) => i.full === fullOriginal);
    const lista = anterior ? listaInsumos.map((i) => i.full === fullOriginal ? novo : i) : [novo, ...listaInsumos];
    setListaInsumos(lista);
    void persistir("materials", lista);
    registrarAuditoria({ modulo: "Insumos", registro: full, campo: anterior ? "Cadastro" : "Novo insumo", valorAnterior: anterior?.full ?? "—", valorNovo: `${full} — ${entrada.custoUnitario ?? "sem custo"}`, motivo: anterior ? "Edição cadastral" : "Inclusão cadastral" });
  }, [listaInsumos, persistir, registrarAuditoria]);

  const importarInsumos = useCallback((entradas: InsumoEntrada[], arquivo: string) => {
    let atualizados = 0;
    let novos = 0;
    const mapa = new Map(listaInsumos.map((i) => [i.codigo.toUpperCase(), i]));
    entradas.forEach((e) => {
      if (mapa.has(e.codigo.toUpperCase())) atualizados += 1; else novos += 1;
      mapa.set(e.codigo.toUpperCase(), { ...e, full: `${e.codigo} - ${e.descricao}` });
    });
    const lista = Array.from(mapa.values());
    setListaInsumos(lista);
    void persistir("materials", lista);
    registrarAuditoria({ modulo: "Insumos", registro: arquivo, campo: "Importação em lote", valorAnterior: "Base anterior", valorNovo: `${atualizados} atualizados; ${novos} novos`, motivo: "Importação validada" });
    return { atualizados, novos };
  }, [listaInsumos, persistir, registrarAuditoria]);

  const fontes = useMemo<FontesCusto>(() => {
    const insumos = mapaInsumos(listaInsumos);
    const cache = new Map<string, number | null>();
    const emCalculo = new Set<string>();
    const f: FontesCusto = { insumos };
    // Semiacabado = soma da MP da sua própria estrutura vigente (evita ciclos).
    f.semiacabado = (item) => {
      if (cache.has(item)) return cache.get(item) ?? null;
      const linhas = bomEditado[item] ?? bomDoProduto(item).map(normalizeItem);
      if (!linhas.length || emCalculo.has(item)) return null;
      emCalculo.add(item);
      const itens = linhas.map((l) => custearItem(l, f));
      emCalculo.delete(item);
      const total = itens.some((i) => i.custoTotal === null) ? null : itens.reduce((s, i) => s + (i.custoTotal ?? 0), 0);
      cache.set(item, total);
      return total;
    };
    return f;
  }, [listaInsumos, bomEditado]);

  const itensBom = useCallback((produto: string) => {
    const editado = bomEditado[produto];
    return (editado ?? bomDoProduto(produto).map(normalizeItem)).map((i) => custearItem(i, fontes));
  }, [bomEditado, fontes]);

  const baseIndustrial = useMemo<BaseIndustrial>(() => ({ setores: centroCustos.setores, roteiro: centroCustos.roteiro, guia: guiaCdc }), [centroCustos, guiaCdc]);
  const setoresCalculadosVigentes = useMemo(() => setoresVigentes(baseIndustrial), [baseIndustrial]);

  const salvarBom = useCallback((produto: string, itens: ItemAdicionado[], campo: string) => {
    const state = { ...bomEditado, [produto]: itens };
    setBomEditado(state);
    void persistir("bom", state);
    registrarAuditoria({ modulo: "Estruturas / BOM", registro: produto, campo, valorAnterior: "Estrutura anterior", valorNovo: `${itens.length} componentes`, motivo: "Manutenção da estrutura" });
  }, [bomEditado, persistir, registrarAuditoria]);

  const adicionarItemBom = useCallback((produto: string, item: ItemAdicionado) => salvarBom(produto, [...itensBom(produto).map(normalizeItem), item], `Novo componente — ${item.item}`), [itensBom, salvarBom]);
  const salvarItemBom = useCallback((produto: string, indice: number, item: ItemAdicionado) => {
    const itens = itensBom(produto).map(normalizeItem);
    if (!itens[indice]) return;
    itens[indice] = item;
    salvarBom(produto, itens, `Componente editado — ${item.item}`);
  }, [itensBom, salvarBom]);
  const removerItemBom = useCallback((produto: string, indice: number) => {
    const itens = itensBom(produto).map(normalizeItem);
    if (!itens[indice]) return;
    itens.splice(indice, 1);
    salvarBom(produto, itens, "Componente removido");
  }, [itensBom, salvarBom]);
  const removerItemAdicionado = useCallback((produto: string, item: string) => {
    const indice = itensBom(produto).findIndex((i) => i.item === item);
    if (indice >= 0) removerItemBom(produto, indice);
  }, [itensBom, removerItemBom]);

  const persistirCustos = useCallback((cc: CentroCustosEditavel, guia: GuiaCdc) => {
    void persistir("costCenters", { ...cc, guia });
  }, [persistir]);
  const atualizarSetor = useCallback((indice: number, setor: Setor) => {
    const setores = centroCustos.setores.map((s, i) => i === indice ? setor : s);
    const novo = { ...centroCustos, setores };
    setCentroCustos(novo); persistirCustos(novo, guiaCdc);
    registrarAuditoria({ modulo: "Centro de Custos", registro: setor.nome, campo: "Custo por setor", valorAnterior: "Valor anterior", valorNovo: "Atualizado", motivo: "Manutenção industrial" });
  }, [centroCustos, guiaCdc, persistirCustos, registrarAuditoria]);
  const atualizarRoteiro = useCallback((indice: number, roteiro: RoteiroLinha) => {
    const novo = { ...centroCustos, roteiro: centroCustos.roteiro.map((r, i) => i === indice ? roteiro : r) };
    setCentroCustos(novo); persistirCustos(novo, guiaCdc);
    registrarAuditoria({ modulo: "Centro de Custos", registro: roteiro.produto, campo: "Roteiro", valorAnterior: "Valor anterior", valorNovo: "Atualizado", motivo: "Manutenção industrial" });
  }, [centroCustos, guiaCdc, persistirCustos, registrarAuditoria]);
  const atualizarMaoDeObra = useCallback((linha: number, setor: string, valor: number) => {
    const novo = structuredClone(guiaCdc);
    const alvo = novo.maoDeObra[linha]; if (!alvo) return;
    const antes = alvo.valores[setor];
    alvo.valores[setor] = valor; setGuiaCdc(novo); persistirCustos(centroCustos, novo);
    registrarAuditoria({ modulo: "Centro de Custos", registro: `${alvo.funcao} — ${setor}`, campo: "Rateio de mão de obra", valorAnterior: String(antes ?? "—"), valorNovo: String(valor), motivo: "Manutenção industrial" });
  }, [guiaCdc, centroCustos, persistirCustos, registrarAuditoria]);

  const registrarVersao = useCallback((v: Omit<VersaoPreco, "id" | "data" | "origem">) => {
    if (!userId) return;
    const local: VersaoPreco = { ...v, id: crypto.randomUUID(), data: new Date().toISOString(), origem: "Sistema compartilhado" };
    setHistorico((prev) => [local, ...prev]);
    void supabase.from("price_simulations").insert({ user_id: userId, product: v.produto, scenario: v.cenario, cost: v.custo, margin: v.margem, price: v.preco, calculation: { source: "pricing-cockpit", ...(v.desconto !== undefined ? { discount: v.desconto, basePrice: v.precoOriginal, quantity: v.quantidade } : {}) }, status: v.status });
  }, [userId]);

  const value = useMemo<Ctx>(() => ({
    tetoDescontoProduto, salvarTetoDesconto, margemProduto, salvarMargemProduto, demonstrativo, importarDemonstrativo, adicionarMesDespesas, atualizarDespesa,
    metodoDespesas, definirMetodoDespesas, despesasPercentual, comparativoDespesas,
    listaInsumos, salvarInsumo, importarInsumos, itensBom, adicionarItemBom,
    salvarItemBom, removerItemBom, removerItemAdicionado, centroCustos, guiaCdc,
    baseIndustrial, setoresCalculados: setoresCalculadosVigentes, atualizarSetor, atualizarRoteiro, atualizarMaoDeObra,
    auditoria, registrarAuditoria, historico, registrarVersao, usuario,
    autenticado: userId !== null, sincronizando, gravacao,
  }), [tetoDescontoProduto, salvarTetoDesconto, margemProduto, salvarMargemProduto, demonstrativo, importarDemonstrativo, adicionarMesDespesas, atualizarDespesa, metodoDespesas, definirMetodoDespesas, despesasPercentual, comparativoDespesas, listaInsumos, salvarInsumo, importarInsumos, itensBom, adicionarItemBom, salvarItemBom, removerItemBom, removerItemAdicionado, centroCustos, guiaCdc, baseIndustrial, setoresCalculadosVigentes, atualizarSetor, atualizarRoteiro, atualizarMaoDeObra, auditoria, registrarAuditoria, historico, registrarVersao, usuario, userId, sincronizando, gravacao]);

  return <PrototypeContext.Provider value={value}>{children}</PrototypeContext.Provider>;
}

export function usePrototype(): Ctx {
  const ctx = useContext(PrototypeContext);
  if (!ctx) throw new Error("usePrototype precisa estar dentro de PrototypeProvider");
  return ctx;
}

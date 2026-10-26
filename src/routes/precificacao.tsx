import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  BadgeDollarSign,
  Boxes,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  Copy,
  Download,
  Factory,
  Minus,
  Percent,
  Plus,
  Search,
  ShieldAlert,
  WalletCards,
  Save,
  Eye,
  ShieldCheck,
  LoaderCircle,
} from "lucide-react";
import { toast } from "sonner";
import { DESCONTO_INICIAL, limitarDesconto, precoComDesconto, tetoValido } from "@/lib/descontos";
import { margemValida } from "@/lib/margens";
import { categoriaDoProduto, parametros, produtos } from "@/data";
import { money, moneyPreciso, pct, qtd } from "@/lib/format";
import { calcularPreco, cenarioSugerido, parametrosPadrao, type Cenario } from "@/lib/pricing";
import { usePrototype } from "@/state/prototype";
import { useAcesso } from "@/lib/acesso";
import { mostraDetalhesPrecificacao } from "@/lib/visao-precificacao";
import { exportarPrecificacaoExcel, type LinhaMemoriaExport } from "@/lib/planilha-precificacao";
import { despesasVigentes, simplesVigente } from "@/lib/correcoes";
import { DemoTag, EmptyNote, PageHeader, Panel, Td, Th } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";

type Search = { produto?: string | undefined };

export const Route = createFileRoute("/precificacao")({
  validateSearch: (search: Record<string, unknown>): Search =>
    typeof search["produto"] === "string" ? { produto: search["produto"] } : {},
  head: () => ({
    meta: [
      { title: "Precificação — Simulador com Memória de Cálculo" },
      {
        name: "description",
        content:
          "Painel comercial para calcular o preço final por produto, cenário de venda, custos, despesas, impostos e margem.",
      },
      { property: "og:title", content: "Precificação — Simulador com Memória de Cálculo" },
      {
        property: "og:description",
        content: "Formação de preço comercial por produto, com parâmetros claros e detalhes técnicos auditáveis.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Precificacao,
});

const CENARIOS: Cenario[] = [
  "Venda Normal",
  "Venda com Base Reduzida",
  "Venda com Material Via Tonial",
];

function Precificacao() {
  const { produto } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const {
    tetoDescontoProduto,
    salvarTetoDesconto,
    margemProduto,
    salvarMargemProduto,
    sincronizando,
    itensBom,
    registrarVersao,
    registrarAuditoria,
    metodoDespesas,
    definirMetodoDespesas,
    despesasPercentual,
    comparativoDespesas,
    autenticado,
    baseIndustrial,
  } = usePrototype();
  const acesso = useAcesso();
  const [visaoVendedor, setVisaoVendedor] = useState(false);
  // Custos, encargos, condições comerciais e memória de cálculo: somente gerente e admin.
  const veDetalhes = mostraDetalhesPrecificacao(acesso.nivel, visaoVendedor);
  const padrao = parametrosPadrao();

  const selecionado =
    produto && produtos.some((p) => p.full === produto) ? produto : parametros.produtoExemplo;

  const [cenario, setCenario] = useState<Cenario>(cenarioSugerido(selecionado));
  const [margemEditada, setMargemEditada] = useState<{ produto: string; valor: number } | null>(null);
  const margemSalva = margemProduto(selecionado) * 100;
  const margem = margemEditada?.produto === selecionado ? margemEditada.valor : margemSalva;
  const setMargem = (valor: number) => setMargemEditada({ produto: selecionado, valor });
  const [salvandoMargem, setSalvandoMargem] = useState(false);
  async function salvarMargem() {
    setSalvandoMargem(true);
    try {
      await salvarMargemProduto(selecionado, margem / 100);
      setMargemEditada(null);
      toast.success("Margem do produto salva.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a margem.");
    } finally {
      setSalvandoMargem(false);
    }
  }
  const [comissao, setComissao] = useState(padrao.comissao * 100);
  const [inadimplencia, setInadimplencia] = useState(padrao.inadimplencia * 100);
  const despesasPct = (despesasPercentual ?? padrao.despesas) * 100;

  const [salvo, setSalvo] = useState<string | null>(null);
  const [buscaProduto, setBuscaProduto] = useState("");
  const [categoria, setCategoria] = useState("TODOS");
  const [quantidade, setQuantidade] = useState(1);
  const [descontoEditado, setDescontoEditado] = useState<{ produto: string; valor: number } | null>(null);
  const teto = tetoDescontoProduto(selecionado);
  const [codigoSelecionado, ...partesDescricao] = selecionado.split(" - ");
  const descricaoSelecionada = partesDescricao.join(" - ");

  const desconto = limitarDesconto(descontoEditado?.produto === selecionado ? descontoEditado.valor : DESCONTO_INICIAL, teto);
  const [tetoEditado, setTetoEditado] = useState<{ produto: string; valor: number } | null>(null);
  const tetoRascunho = tetoEditado?.produto === selecionado ? tetoEditado.valor : teto * 100;
  const [salvandoTeto, setSalvandoTeto] = useState(false);
  async function salvarTeto() {
    setSalvandoTeto(true);
    try {
      await salvarTetoDesconto(selecionado, tetoRascunho / 100);
      setTetoEditado(null);
      toast.success("Teto de desconto salvo.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o teto.");
    } finally { setSalvandoTeto(false); }
  }
  const [copiado, setCopiado] = useState(false);
  const categorias = useMemo(() => Array.from(new Set(produtos.map((p) => categoriaDoProduto(p.full)))).sort(), []);
  const produtosFiltrados = useMemo(
    () =>
      produtos.filter(
        (p) =>
          p.full.toLowerCase().includes(buscaProduto.toLowerCase()) &&
          (categoria === "TODOS" || categoriaDoProduto(p.full) === categoria),
      ),
    [buscaProduto, categoria],
  );

  const itens = itensBom(selecionado);
  const r = calcularPreco({
    produto: selecionado,
    cenario,
    itensMP: itens,
    margem: margem / 100,
    comissao: comissao / 100,
    inadimplencia: inadimplencia / 100,
    despesas: despesasPct / 100,
    frota: false,
    km: padrao.km,
    pecasPorEntrega: padrao.pecasPorEntrega,
    base: baseIndustrial,
  });

  const preco = precoComDesconto(r.preco, desconto, teto);

  /** Mesmo produto e parâmetros, trocando apenas a forma de apurar as despesas. */
  const precoPorMetodo = (
    ["ponderado", "media"] as const
  ).map((m) => {
    const taxa =
      m === "media" ? comparativoDespesas.mediaSimples : comparativoDespesas.ponderada;
    return {
      metodo: m,
      taxa,
      preco:
        taxa === null
          ? null
          : calcularPreco({
              produto: selecionado,
              cenario,
              itensMP: itens,
              margem: margem / 100,
              comissao: comissao / 100,
              inadimplencia: inadimplencia / 100,
              despesas: taxa,
              frota: false,
              km: padrao.km,
              pecasPorEntrega: padrao.pecasPorEntrega,
              base: baseIndustrial,
            }).preco,
    };
  });
  const diferencaMetodos =
    precoPorMetodo[0]?.preco !== null && precoPorMetodo[1]?.preco != null
      ? (precoPorMetodo[0]?.preco ?? 0) - (precoPorMetodo[1]?.preco ?? 0)
      : null;
  const linhasMemoria: { rotulo: string; base: string; valor: string; tipo?: "total" | "grupo" }[] = [
    {
      rotulo: "1. Matéria-prima (BOM)",
      base: `${qtd(itens.length)} componentes`,
      valor: money(r.custoMP),
    },
    {
      rotulo: "2. Custo de produção",
      base:
        r.producao.componentes === null
          ? "Centro de Custos — indisponível"
          : `Setor ${money(r.producao.componentes.setor)} + central ${money(
              r.producao.componentes.central,
            )} + armação ${money(r.producao.componentes.armacao)} + pintura ${money(
              r.producao.componentes.pintura,
            )}`,
      valor: r.custoProducao === null ? "Bloqueado" : money(r.custoProducao),
    },
    {
      rotulo: "2a. Armação (correção)",
      base:
        r.producao.horasArmacao > 0
          ? `${qtd(r.producao.horasArmacao)} h × ${money(r.producao.taxaArmacao)}/h — contada uma única vez`
          : "Produto sem etapa de armação",
      valor: money(r.producao.componentes?.armacao ?? 0),
    },
    {
      rotulo: "Custo absoluto",
      base: "1 + 2",
      valor: money(r.custoAbsoluto),
      tipo: "grupo",
    },
    {
      rotulo: "3. Despesas operacionais",
      base:
        metodoDespesas === "media"
          ? `Média das despesas ajustadas de ${despesasVigentes.meses} meses`
          : `Taxa ponderada ajustada: soma das despesas sem frete ÷ soma das receitas de ${despesasVigentes.meses} meses`,
      valor: pct(r.despesas, 4),
    },
    {
      rotulo: "4. Impostos do cenário",
      base: r.regra.detalhe
        ? `ICMS ${pct(r.regra.detalhe.icms, 0)} · PIS ${pct(r.regra.detalhe.pis, 2)} · COFINS ${pct(
            r.regra.detalhe.cofins,
            1,
          )} · IRPJ ${pct(r.regra.detalhe.irpj, 2)} · CSLL ${pct(r.regra.detalhe.csll, 1)}`
        : `Simples: alíquota efetiva = (RBT12 × ${pct(simplesVigente.aliquotaNominal, 2)} − ${money(
            simplesVigente.valorDeduzir,
          )}) ÷ RBT12`,
      valor: pct(r.impostos, 2),
    },
    { rotulo: "5. Comissão", base: "Parâmetro comercial", valor: pct(r.comissao, 2) },
    { rotulo: "6. Inadimplência", base: "Parâmetro comercial", valor: pct(r.inadimplencia, 2) },
    { rotulo: "7. Margem de lucro", base: "Parâmetro comercial", valor: pct(r.margem, 2) },
    {
      rotulo: "Soma dos percentuais",
      base: "3 + 4 + 5 + 6 + 7",
      valor: pct(r.somaPercentuais, 2),
      tipo: "grupo",
    },
    {
      rotulo: "Preço bruto (markup divisor)",
      base: "Custo absoluto ÷ (1 − soma dos percentuais)",
      valor: r.precoBruto === null ? "Bloqueado" : money(r.precoBruto),
      tipo: "grupo",
    },
    {
      rotulo: "Preço de venda sugerido",
      base: "Preço bruto arredondado em 2 casas",
      valor: money(r.preco),
      tipo: "grupo",
    },
    { rotulo: "8. Desconto comercial", base: `Teto do produto: ${pct(teto, 2)}`, valor: pct(desconto, 2) },
    { rotulo: "Preço final com desconto", base: "Preço sugerido × (1 − desconto)", valor: money(preco), tipo: "total" },
  ];

  /** Mesma memória de cálculo da tela, com valores numéricos para o Excel. */
  const linhasExcel: LinhaMemoriaExport[] = [
    { rotulo: "1. Matéria-prima (BOM)", base: `${qtd(itens.length)} componentes`, valor: r.custoMP, formato: "moeda" },
    {
      rotulo: "2. Custo de produção",
      base: linhasMemoria[1]?.base ?? "",
      valor: r.custoProducao,
      formato: "moeda",
    },
    {
      rotulo: "2a. Armação (correção)",
      base: linhasMemoria[2]?.base ?? "",
      valor: r.producao.componentes?.armacao ?? 0,
      formato: "moeda",
    },
    { rotulo: "Custo absoluto", base: "1 + 2", valor: r.custoAbsoluto, formato: "moeda", tipo: "grupo" },
    {
      rotulo: "3. Despesas operacionais",
      base: linhasMemoria[4]?.base ?? "",
      valor: r.despesas,
      formato: "percentual",
    },
    {
      rotulo: "4. Impostos do cenário",
      base: linhasMemoria[5]?.base ?? "",
      valor: r.impostos,
      formato: "percentual",
    },
    { rotulo: "5. Comissão", base: "Parâmetro comercial", valor: r.comissao, formato: "percentual" },
    {
      rotulo: "6. Inadimplência",
      base: "Parâmetro comercial",
      valor: r.inadimplencia,
      formato: "percentual",
    },
    { rotulo: "7. Margem de lucro", base: "Parâmetro comercial", valor: r.margem, formato: "percentual" },
    {
      rotulo: "Soma dos percentuais",
      base: "3 + 4 + 5 + 6 + 7",
      valor: r.somaPercentuais,
      formato: "percentual",
      tipo: "grupo",
    },
    {
      rotulo: "Preço bruto (markup divisor)",
      base: "Custo absoluto ÷ (1 − soma dos percentuais)",
      valor: r.precoBruto,
      formato: "moeda",
      tipo: "grupo",
    },
    {
      rotulo: "Preço de venda sugerido",
      base: "Preço bruto arredondado em 2 casas",
      valor: r.preco,
      formato: "moeda",
      tipo: "grupo",
    },
    { rotulo: "8. Desconto comercial", base: `Teto do produto: ${pct(teto, 2)}`, valor: desconto, formato: "percentual" },
    { rotulo: "Preço final com desconto", base: "Preço sugerido × (1 − desconto)", valor: preco, formato: "moeda", tipo: "total" },
  ];

  function exportarExcel() {
    exportarPrecificacaoExcel({
      produto: selecionado,
      cenario,
      linhas: linhasExcel,
      itens: itens.map((i) => ({
        item: i.item,
        quantidade: i.quantidade,
        unidade: i.unidade,
        custoUnitario: i.custoUnitario,
        custoTotal: i.custoTotal,
      })),
      nomeArquivo: `precificacao-${selecionado.split(" ")[0] ?? "produto"}.xlsx`,
    });
  }

  function copiarCotacao() {
    if (preco === null) return;
    const texto = [
      `Cotação D'AGOSTINI — ${selecionado}`,
      `Preço unitário: ${money(preco)}`,
      ...(desconto > 0 ? [`Desconto: ${pct(desconto, 2)}`] : []),
      `Quantidade: ${qtd(quantidade)}`,
      `Total: ${money(preco * quantidade)}`,
    ].join("\n");
    void navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  function salvar() {
    if (preco === null) return;
    registrarVersao({
      produto: selecionado,
      custo: r.custoAbsoluto,
      margem: r.margem,
      preco,
      desconto,
      precoOriginal: r.preco ?? 0,
      quantidade,
      cenario,
      status: "Simulação",
    });
    registrarAuditoria({
      modulo: "Precificação",
      registro: selecionado,
      campo: `Preço simulado — ${cenario}`,
      valorAnterior: "—",
      valorNovo: money(preco),
      motivo: "Simulação salva no sistema",
    });
    setSalvo(`Simulação registrada no histórico às ${new Date().toLocaleTimeString("pt-BR")}`);
  }

  return (
    <>
      <PageHeader
        titulo="Precificação"
        aba="Precificação"
        descricao={veDetalhes
          ? "Selecione o produto, ajuste as condições comerciais e consulte o preço final."
          : "Selecione o produto e o tipo de venda para consultar o preço final."}
        acoes={
          <>
            {acesso.nivel === "admin" ? (
              <div role="group" aria-label="Visão da Precificação" className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/40 p-1">
                <Button type="button" size="sm" variant={!visaoVendedor ? "default" : "ghost"} aria-pressed={!visaoVendedor} onClick={() => setVisaoVendedor(false)}>
                  <ShieldCheck className="size-4" /> Visão adm
                </Button>
                <Button type="button" size="sm" variant={visaoVendedor ? "default" : "ghost"} aria-pressed={visaoVendedor} onClick={() => setVisaoVendedor(true)}>
                  <Eye className="size-4" /> Visão vendedor
                </Button>
              </div>
            ) : null}
            {veDetalhes ? (
              <Button
                variant="outline"
                type="button"
                onClick={exportarExcel}
              >
                <Download className="size-4" /> Exportar Excel
              </Button>
            ) : null}
            <Button
              type="button"
              onClick={salvar}
              disabled={preco === null || !autenticado}
              title={autenticado ? "Salvar simulação" : "Entre para salvar"}
              className="bg-green text-green-foreground hover:bg-green/90"
            >
              <Save className="size-4" /> Salvar simulação
            </Button>
          </>
        }
      />

      {salvo ? (
        <p className="mb-4 rounded-md border border-green bg-green-soft px-3 py-2 text-sm font-medium text-accent-foreground">
          {salvo} — veja em{" "}
          <Link to="/historico" className="underline">
            Histórico de Preços
          </Link>
          .
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <Panel titulo="Produtos" subtitulo={`${produtosFiltrados.length} encontrados`} bodyClassName="p-0">
            <div className="relative border-b border-border p-3">
              <Search className="pointer-events-none absolute top-5 left-5 size-4 text-muted-foreground" />
              <input value={buscaProduto} onChange={(e) => setBuscaProduto(e.target.value)} placeholder="Código ou descrição" className="h-9 w-full rounded-sm border border-input bg-background pr-2 pl-8 text-sm outline-none focus:border-ring" />
              <div className="mt-2 flex flex-wrap gap-1">
                {["TODOS", ...categorias].map((c) => (
                  <button key={c} type="button" onClick={() => setCategoria(c)} className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${categoria === c ? "border-green bg-green-soft text-accent-foreground" : "border-border text-muted-foreground hover:bg-secondary"}`}>{c}</button>
                ))}
              </div>
            </div>
            <div className="max-h-72 overflow-auto p-1.5 xl:max-h-[56vh]">
              {produtosFiltrados.map((p) => {
                const [codigo, ...descricao] = p.full.split(" - ");
                return <Button key={p.full} variant="ghost" type="button" onClick={() => { navigate({ search: { produto: p.full } }); setCenario(cenarioSugerido(p.full)); setMargemEditada(null); setTetoEditado(null); setDescontoEditado(null); setSalvo(null); }} className={`mb-1 h-auto w-full justify-start whitespace-normal rounded-sm border-l-2 px-3 py-2 text-left shadow-none ${selecionado === p.full ? "border-green bg-green-soft hover:bg-green-soft" : "border-transparent hover:bg-secondary"}`}>
                  <span className="min-w-0">
                  <span className="block text-xs font-black text-foreground">{codigo}</span>
                  <span className="mt-0.5 block line-clamp-2 text-[11px] text-muted-foreground">{descricao.join(" - ")}</span>
                  </span>
                </Button>;
              })}
            </div>
          </Panel>
        </aside>

        <div className="min-w-0 space-y-4">
          <section className="grid items-stretch gap-3 rounded-md border border-border bg-card p-4 shadow-panel lg:grid-cols-[minmax(0,1fr)_19rem]">
            <div className="flex min-w-0 flex-col justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-green uppercase">Produto selecionado</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <h2 className="min-w-0 text-3xl leading-none font-black tracking-tight break-words text-foreground">{codigoSelecionado}</h2>
                  <span className="rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[10px] font-bold text-muted-foreground uppercase">{categoriaDoProduto(selecionado)}</span>
                </div>
                {descricaoSelecionada ? <p className="mt-2 line-clamp-2 text-sm leading-snug font-semibold text-muted-foreground">{descricaoSelecionada}</p> : null}
              </div>
              <label className="inline-flex w-fit items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                Tipo de venda
                <select
                  aria-label="Tipo de venda"
                  value={cenario}
                  onChange={(e) => { setCenario(e.target.value as Cenario); setSalvo(null); }}
                  className="h-7 max-w-full rounded-sm border border-border bg-background px-1.5 text-[11px] font-bold text-foreground outline-none focus:border-ring"
                >
                  {CENARIOS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            </div>


            <div className="flex min-w-0 flex-col rounded-md border border-green bg-green-soft p-3 text-accent-foreground">
              <div>
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase"><BadgeDollarSign className="size-3.5" /> Preço final unitário</p>
                <p className="mt-0.5 text-2xl font-black tabular-nums">{preco === null ? "Indisponível" : money(preco)}</p>
                <p className="text-[11px] font-medium">{cenario}</p>
              </div>
              {desconto > 0 ? <p className="mt-1.5 text-[11px]">De <span className="line-through">{money(r.preco)}</span> · desconto {pct(desconto, 2)}</p> : null}
              <div className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-x-2.5 gap-y-1">
                <label className="min-w-0 text-[11px] font-semibold">Quantidade
                  <input aria-label="Quantidade" type="number" min="1" value={quantidade} onChange={(e) => setQuantidade(Math.max(1, Number(e.target.value) || 1))} className="mt-1 block h-9 w-full min-w-0 rounded-sm border border-green bg-background px-2.5 text-sm font-semibold tabular-nums outline-none focus:ring-2 focus:ring-ring" />
                </label>
                <label className="min-w-0 text-[11px] font-semibold">Desconto (%)
                  <input aria-label="Desconto (%)" type="number" min="0" max={teto * 100} step="0.5" value={Number((desconto * 100).toFixed(2))} disabled={sincronizando} onChange={(e) => {
                    const informado = Number(e.target.value);
                    if (informado > teto * 100) toast.error(`Desconto máximo deste produto: ${pct(teto, 2)}.`);
                    setDescontoEditado({ produto: selecionado, valor: limitarDesconto(informado / 100, teto) });
                    setSalvo(null); setCopiado(false);
                  }} className="mt-1 block h-9 w-full min-w-0 rounded-sm border border-green bg-background px-2.5 text-sm font-semibold tabular-nums outline-none focus:ring-2 focus:ring-ring" />
                </label>
                <span className="col-start-2 text-[10px] font-normal">Máximo: {pct(teto, 0)}</span>
              </div>
              <div className="mt-3 mb-3 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-t border-green/30 pt-2.5">
                <p className="min-w-0 text-[11px] font-semibold uppercase">Total do pedido</p>
                <p className="text-right text-base font-black tabular-nums">{preco === null ? "—" : money(preco * quantidade)}</p>
              </div>
              <Button type="button" variant="outline" className="mt-auto h-9 w-full text-xs" disabled={preco === null} onClick={copiarCotacao}>
                {copiado ? <Check className="size-4" /> : <Copy className="size-4" />} {copiado ? "Cotação copiada" : "Copiar cotação"}
              </Button>
            </div>
          </section>

          {veDetalhes ? (
          <section aria-label="Custos calculados">
            <p className="mb-2 text-xs font-bold text-muted-foreground uppercase">Custos e encargos · calculados pelo sistema</p>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Matéria-prima", value: money(r.custoMP), detail: `${qtd(itens.length)} componentes`, Icon: Boxes },
                { label: "Custo de produção", value: r.custoProducao === null ? "Bloqueado" : money(r.custoProducao), detail: "Roteiro e centros de custos", Icon: Factory },
                { label: "Despesas", value: pct(r.despesas, 2), detail: metodoDespesas === "media" ? "Média ajustada" : "Taxa ponderada ajustada", Icon: WalletCards },
                { label: "Impostos", value: pct(r.impostos, 2), detail: cenario, Icon: BriefcaseBusiness },
              ].map(({ label, value, detail, Icon }) => (
                <article key={label} className="rounded-md border border-border bg-secondary/40 px-3 py-2.5">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase"><Icon className="size-3.5" />{label}</p>
                  <p className="mt-0.5 text-lg font-black text-foreground tabular-nums">{value}</p>
                  <p className="text-[11px] text-muted-foreground">{detail}</p>
                </article>
              ))}
            </div>
          </section>
          ) : null}

          {veDetalhes ? (
          <section aria-label="Condições comerciais" aria-busy={salvandoMargem}>
            <fieldset disabled={salvandoMargem || sincronizando} className="min-w-0">
            <p className="mb-2 text-xs font-bold text-muted-foreground uppercase">Condições comerciais · editáveis</p>
            <div className="grid gap-2.5 sm:grid-cols-3">
              {[
                { label: "Margem de lucro", value: margem, setValue: setMargem, Icon: BadgeDollarSign },
                { label: "Comissão", value: comissao, setValue: setComissao, Icon: Percent },
                { label: "Inadimplência", value: inadimplencia, setValue: setInadimplencia, Icon: ShieldAlert },
              ].map(({ label, value, setValue, Icon }) => (
                <label key={label} className="rounded-md border border-green bg-card px-3 py-2.5 shadow-panel">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-accent-foreground uppercase"><Icon className="size-3.5" />{label}</span>
                  <span className="mt-2 flex items-center gap-2">
                    <Button type="button" size="icon" variant="outline" aria-label={`Diminuir ${label}`} onClick={(e) => { e.preventDefault(); setValue(Math.max(0, Math.round((value - 0.5) * 100) / 100)); setSalvo(null); }}><Minus className="size-4" /></Button>
                    <span className="relative flex-1">
                      <input type="number" min="0" step="0.01" value={Number(value.toFixed(4))} onChange={(e) => { setValue(Number(e.target.value)); setSalvo(null); }} className="h-9 w-full rounded-sm border border-input bg-green-soft px-2.5 pr-7 text-right text-base font-black text-accent-foreground outline-none focus:ring-2 focus:ring-ring" />
                      <span className="pointer-events-none absolute top-2 right-2.5 text-xs font-bold text-accent-foreground">%</span>
                    </span>
                    <Button type="button" size="icon" variant="outline" aria-label={`Aumentar ${label}`} onClick={(e) => { e.preventDefault(); setValue(Math.round((value + 0.5) * 100) / 100); setSalvo(null); }}><Plus className="size-4" /></Button>
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">Margem cadastrada: {pct(margemSalva / 100, 2)}</p>
              <Button type="button" size="sm" onClick={salvarMargem} disabled={!autenticado || margem === margemSalva || !margemValida(margem / 100)}>
                {salvandoMargem ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar margem do produto
              </Button>
            </div>
            </fieldset>
          </section>
          ) : null}

          {veDetalhes ? (
            <section aria-label="Teto de desconto" className="flex flex-wrap items-end justify-between gap-3 border-t border-border pt-4">
              <label className="text-xs font-semibold text-foreground">Teto de desconto do produto (%)
                <input aria-label="Teto de desconto do produto (%)" type="number" min="0" max="10" step="0.5" value={tetoRascunho} disabled={sincronizando || salvandoTeto} onChange={(e) => setTetoEditado({ produto: selecionado, valor: Math.min(10, Math.max(0, Number(e.target.value) || 0)) })} className="mt-1 block h-9 w-32 rounded-sm border border-input bg-background px-2 text-sm outline-none focus:border-ring" />
              </label>
              <Button type="button" size="sm" variant="outline" onClick={salvarTeto} disabled={sincronizando || salvandoTeto || !autenticado || tetoRascunho === teto * 100 || !tetoValido(tetoRascunho / 100)}>
                {salvandoTeto ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar teto do produto
              </Button>
            </section>
          ) : null}

          {r.bloqueios.length ? (
            <EmptyNote>
              <strong>O preço está bloqueado até estes pontos serem resolvidos:</strong>
              <ul className="mt-1.5 list-disc space-y-1 pl-4">
                {r.bloqueios.slice(0, 6).map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </EmptyNote>
          ) : null}

          {r.alertas.length ? (
            <div className="rounded-md border border-warn bg-demo px-3 py-2 text-sm text-demo-foreground">
              <strong>Avisos do cálculo:</strong>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {Array.from(new Set(r.alertas))
                  .slice(0, 5)
                  .map((a) => (
                    <li key={a}>{a}</li>
                  ))}
              </ul>
            </div>
          ) : null}

          {veDetalhes ? (
          <>
          {r.reconciliacao ? (
            <p
              className={
                r.reconciliacao.ok
                  ? "rounded-md border border-green bg-green-soft px-3 py-2 text-sm font-medium text-accent-foreground"
                  : "rounded-md border border-destructive px-3 py-2 text-sm font-medium text-destructive"
              }
            >
              Validação de integridade: preço − (custos absolutos + preço × soma dos percentuais) ={" "}
              {moneyPreciso(r.reconciliacao.diferenca)}{" "}
              {r.reconciliacao.ok ? "— cálculo consistente com a DRE." : "— divergência detectada."}
            </p>
          ) : null}

          <details className="group rounded-md border border-border bg-card px-4 shadow-panel">
            <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-sm font-bold"><span>Detalhes técnicos e memória de cálculo · {linhasMemoria.length} etapas</span><ChevronDown className="size-4 transition-transform group-open:rotate-180" /></summary>
            <div className="grid gap-4 border-t border-border py-4 lg:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-bold">Critério das despesas</p>
                {precoPorMetodo.map((op) => <label key={op.metodo} className={`flex cursor-pointer flex-col rounded-sm border px-3 py-2 text-sm ${metodoDespesas === op.metodo ? "border-green bg-green-soft" : "border-border"}`}><span className="font-semibold"><input type="radio" name="metodo-despesas-preco" checked={metodoDespesas === op.metodo} onChange={() => { definirMetodoDespesas(op.metodo); setSalvo(null); }} className="mr-2" />{op.metodo === "media" ? "Média simples" : "Taxa ponderada"}</span><span className="pl-6 text-xs text-muted-foreground">Despesas {pct(op.taxa, 4)} · preço {money(op.preco)}</span></label>)}
                <p className="text-xs text-muted-foreground">Diferença no preço: {diferencaMetodos === null ? "—" : money(Math.abs(diferencaMetodos))}</p>
              </div>
              <label className="block text-sm">
                <span className="font-bold">Despesas operacionais (%)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={Number(despesasPct.toFixed(4))}
                  readOnly
                  className="mt-2 h-10 w-full rounded-sm border border-input bg-background px-3 text-sm tabular-nums outline-none focus:border-ring"
                />
                <span className="mt-1 block text-xs text-muted-foreground">Percentual vigente do demonstrativo de despesas.</span>
              </label>
            </div>
          <Panel
            titulo="Memória de cálculo"
            subtitulo="Cada passo rastreável até a origem do dado"
            bodyClassName="p-0"
          >
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Etapa</Th>
                  <Th>Base de cálculo</Th>
                  <Th align="right">Valor</Th>
                </tr>
              </thead>
              <tbody>
                {linhasMemoria.map((l) => (
                  <tr
                    key={l.rotulo}
                    className={
                      l.tipo === "total"
                        ? "bg-table-total font-bold"
                        : l.tipo === "grupo"
                          ? "bg-table-group font-semibold"
                          : "odd:bg-secondary/30"
                    }
                  >
                    <Td>{l.rotulo}</Td>
                    <Td className="text-xs text-muted-foreground">{l.base}</Td>
                    <Td align="right">{l.valor}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
          </details>

          <details className="group rounded-md border border-border bg-card px-4 shadow-panel">
            <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-sm font-bold"><span>Composição da matéria-prima · {qtd(itens.length)} componentes</span><ChevronDown className="size-4 transition-transform group-open:rotate-180" /></summary>
          <Panel
            titulo="Composição da matéria-prima"
            subtitulo={`${selecionado} — ${qtd(itens.length)} componentes`}
            acoes={
              <Link
                to="/bom"
                search={{ produto: selecionado }}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Editar estrutura
              </Link>
            }
            bodyClassName="p-0"
          >
            <div className="max-h-[36vh] overflow-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <Th>Componente</Th>
                    <Th align="right">Qtd.</Th>
                    <Th>Un.</Th>
                    <Th align="right">Custo unit.</Th>
                    <Th align="right">Total</Th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((l, i) => (
                    <tr key={`${l.item}-${i}`} className="odd:bg-secondary/30">
                      <Td className="max-w-[22rem] truncate">
                        {l.item} {l.demonstrativo ? <DemoTag>Sessão</DemoTag> : null}
                      </Td>
                      <Td align="right">{qtd(l.quantidade)}</Td>
                      <Td>{l.unidade ?? "—"}</Td>
                      <Td align="right">{moneyPreciso(l.custoUnitario)}</Td>
                      <Td align="right" className="font-semibold">
                        {money(l.custoTotal)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          </details>
          </>
          ) : null}
        </div>
      </div>
    </>
  );
}

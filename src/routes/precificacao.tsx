import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
  Truck,
  WalletCards,
  Save,
} from "lucide-react";
import { categoriaDoProduto, parametros, produtos } from "@/data";
import { money, moneyPreciso, pct, qtd } from "@/lib/format";
import { calcularPreco, cenarioSugerido, parametrosPadrao, type Cenario } from "@/lib/pricing";
import { usePrototype } from "@/state/prototype";
import { exportarPrecificacaoExcel, type LinhaMemoriaExport } from "@/lib/planilha-precificacao";
import { despesasVigentes, frota as frotaParams, simplesVigente } from "@/lib/correcoes";
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
  const padrao = parametrosPadrao();

  const selecionado =
    produto && produtos.some((p) => p.full === produto) ? produto : parametros.produtoExemplo;

  const [cenario, setCenario] = useState<Cenario>(cenarioSugerido(selecionado));
  const [margem, setMargem] = useState(padrao.margem * 100);
  const [comissao, setComissao] = useState(padrao.comissao * 100);
  const [inadimplencia, setInadimplencia] = useState(padrao.inadimplencia * 100);
  const [despesasPct, setDespesasPct] = useState((despesasPercentual ?? padrao.despesas) * 100);

  // Trocar o método de apuração das despesas repõe o percentual vigente no simulador.
  useEffect(() => {
    if (despesasPercentual !== null) setDespesasPct(despesasPercentual * 100);
  }, [despesasPercentual]);

  const [frota, setFrota] = useState(false);
  const [km, setKm] = useState(padrao.km);
  const [pecas, setPecas] = useState(padrao.pecasPorEntrega);
  const [salvo, setSalvo] = useState<string | null>(null);
  const [buscaProduto, setBuscaProduto] = useState("");
  const [categoria, setCategoria] = useState("TODOS");
  const [quantidade, setQuantidade] = useState(1);
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
    frota,
    km,
    pecasPorEntrega: pecas,
    base: baseIndustrial,
  });

  const preco = r.preco;

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
              frota,
              km,
              pecasPorEntrega: pecas,
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
      rotulo: "8. Frete (frota própria)",
      base: frota
        ? `${qtd(km)} km ÷ ${qtd(pecas)} peças × ${money(frotaParams.custoTotalPorKm)}/km × ${qtd(
            parametros.fatorFrete,
          )} (ida e volta)`
        : "Entrega não incluída (retirada no pátio)",
      valor: money(r.logistica),
    },
    {
      rotulo: "Preço de venda sugerido",
      base: "Preço bruto + frete, arredondado em 2 casas",
      valor: money(preco),
      tipo: "total",
    },
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
      rotulo: "8. Frete (frota própria)",
      base: linhasMemoria[11]?.base ?? "",
      valor: r.logistica,
      formato: "moeda",
    },
    {
      rotulo: "Preço de venda sugerido",
      base: "Preço bruto + frete",
      valor: preco,
      formato: "moeda",
      tipo: "total",
    },
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
        descricao="Selecione o produto, ajuste as condições comerciais e consulte o preço final."
        acoes={
          <>
            <Button
              variant="outline"
              type="button"
              onClick={exportarExcel}
            >
              <Download className="size-4" /> Exportar Excel
            </Button>
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

      <div className="grid gap-5 xl:grid-cols-[18rem_minmax(0,1fr)]">
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
                return <Button key={p.full} variant="ghost" type="button" onClick={() => { navigate({ search: { produto: p.full } }); setCenario(cenarioSugerido(p.full)); setSalvo(null); }} className={`mb-1 h-auto w-full justify-start whitespace-normal rounded-sm border-l-2 px-3 py-2 text-left shadow-none ${selecionado === p.full ? "border-green bg-green-soft hover:bg-green-soft" : "border-transparent hover:bg-secondary"}`}>
                  <span className="min-w-0">
                  <span className="block text-xs font-black text-foreground">{codigo}</span>
                  <span className="mt-0.5 block line-clamp-2 text-[11px] text-muted-foreground">{descricao.join(" - ")}</span>
                  </span>
                </Button>;
              })}
            </div>
          </Panel>
        </aside>

        <div className="min-w-0 space-y-5">
          <section className="grid gap-4 rounded-md border border-border bg-card p-5 shadow-panel lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="min-w-0">
              <p className="text-xs font-bold text-green uppercase">Produto selecionado</p>
              <h2 className="mt-1 text-xl font-black text-foreground">{selecionado}</h2>
              <p className="mb-2 mt-4 text-xs font-bold text-muted-foreground uppercase">Tipo de venda</p>
              <div className="flex flex-wrap gap-2">
                {CENARIOS.map((c) => (
                  <Button key={c} type="button" size="sm" variant={cenario === c ? "default" : "outline"} onClick={() => { setCenario(c); setSalvo(null); }}>
                    {c}
                  </Button>
                ))}
              </div>
              <p className="mb-2 mt-4 text-xs font-bold text-muted-foreground uppercase">Entrega</p>
              <div className="flex flex-wrap items-end gap-3">
                <div className="inline-flex rounded-md border border-border p-0.5" role="group" aria-label="Modalidade de entrega">
                  {([[false, "FOB · Retira"], [true, "CIF · Entregue"]] as const).map(([v, l]) => (
                    <Button key={l} type="button" size="sm" variant={frota === v ? "default" : "ghost"} onClick={() => { setFrota(v); setSalvo(null); }}>
                      {v ? <Truck className="size-4" /> : null}{l}
                    </Button>
                  ))}
                </div>
                {frota ? (
                  <>
                    <label className="text-xs font-semibold">Distância (km)
                      <input type="number" min="0" value={km} onChange={(e) => setKm(Number(e.target.value))} className="mt-1 block h-9 w-24 rounded-sm border border-input bg-background px-2 text-sm outline-none focus:border-ring" />
                    </label>
                    <label className="text-xs font-semibold">Peças/entrega
                      <input type="number" min="1" value={pecas} onChange={(e) => setPecas(Number(e.target.value))} className="mt-1 block h-9 w-24 rounded-sm border border-input bg-background px-2 text-sm outline-none focus:border-ring" />
                    </label>
                  </>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-md border-2 border-green bg-green-soft p-4 text-accent-foreground">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold uppercase"><BadgeDollarSign className="size-4" /> Preço final unitário</p>
                <p className="mt-1 text-4xl font-black tabular-nums">{preco === null ? "Indisponível" : money(preco)}</p>
                <p className="text-xs font-medium">{cenario} · {frota ? `CIF, frete ${money(r.logistica)}/peça` : "FOB, sem frete"}</p>
              </div>
              <div className="mt-4 flex items-end gap-2">
                <label className="text-xs font-semibold">Quantidade
                  <input type="number" min="1" value={quantidade} onChange={(e) => setQuantidade(Math.max(1, Number(e.target.value) || 1))} className="mt-1 block h-9 w-20 rounded-sm border border-green bg-background px-2 text-sm outline-none focus:border-ring" />
                </label>
                <div className="min-w-0 flex-1 text-right">
                  <p className="text-[11px] font-semibold uppercase">Total do pedido</p>
                  <p className="text-lg font-black tabular-nums">{preco === null ? "—" : money(preco * quantidade)}</p>
                </div>
              </div>
              <Button type="button" variant="outline" className="mt-3" disabled={preco === null} onClick={copiarCotacao}>
                {copiado ? <Check className="size-4" /> : <Copy className="size-4" />} {copiado ? "Cotação copiada" : "Copiar cotação"}
              </Button>
            </div>
          </section>

          <section aria-label="Custos calculados">
            <p className="mb-2 text-xs font-bold text-muted-foreground uppercase">Custos e encargos · calculados pelo sistema</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Matéria-prima", value: money(r.custoMP), detail: `${qtd(itens.length)} componentes`, Icon: Boxes },
                { label: "Custo de produção", value: r.custoProducao === null ? "Bloqueado" : money(r.custoProducao), detail: "Roteiro e centros de custos", Icon: Factory },
                { label: "Despesas", value: pct(r.despesas, 2), detail: metodoDespesas === "media" ? "Média ajustada" : "Taxa ponderada ajustada", Icon: WalletCards },
                { label: "Impostos", value: pct(r.impostos, 2), detail: cenario, Icon: BriefcaseBusiness },
              ].map(({ label, value, detail, Icon }) => (
                <article key={label} className="rounded-md border border-border bg-secondary/40 px-4 py-3">
                  <p className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase"><Icon className="size-4" />{label}</p>
                  <p className="mt-1 text-xl font-black text-foreground tabular-nums">{value}</p>
                  <p className="text-xs text-muted-foreground">{detail}</p>
                </article>
              ))}
            </div>
          </section>

          <section aria-label="Condições comerciais">
            <p className="mb-2 text-xs font-bold text-muted-foreground uppercase">Condições comerciais · editáveis</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Margem de lucro", value: margem, setValue: setMargem, Icon: BadgeDollarSign },
                { label: "Comissão", value: comissao, setValue: setComissao, Icon: Percent },
                { label: "Inadimplência", value: inadimplencia, setValue: setInadimplencia, Icon: ShieldAlert },
              ].map(({ label, value, setValue, Icon }) => (
                <label key={label} className="rounded-md border border-green bg-card px-4 py-3 shadow-panel">
                  <span className="flex items-center gap-2 text-xs font-bold text-accent-foreground uppercase"><Icon className="size-4" />{label}</span>
                  <span className="mt-2 flex items-center gap-2">
                    <Button type="button" size="icon" variant="outline" aria-label={`Diminuir ${label}`} onClick={(e) => { e.preventDefault(); setValue(Math.max(0, Math.round((value - 0.5) * 100) / 100)); setSalvo(null); }}><Minus className="size-4" /></Button>
                    <span className="relative flex-1">
                      <input type="number" min="0" step="0.01" value={Number(value.toFixed(4))} onChange={(e) => { setValue(Number(e.target.value)); setSalvo(null); }} className="h-10 w-full rounded-sm border border-input bg-green-soft px-3 pr-8 text-right text-lg font-black text-accent-foreground outline-none focus:ring-2 focus:ring-ring" />
                      <span className="pointer-events-none absolute top-2.5 right-3 text-sm font-bold text-accent-foreground">%</span>
                    </span>
                    <Button type="button" size="icon" variant="outline" aria-label={`Aumentar ${label}`} onClick={(e) => { e.preventDefault(); setValue(Math.round((value + 0.5) * 100) / 100); setSalvo(null); }}><Plus className="size-4" /></Button>
                  </span>
                </label>
              ))}
            </div>
          </section>

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
                  onChange={(e) => { setDespesasPct(Number(e.target.value)); setSalvo(null); }}
                  className="mt-2 h-10 w-full rounded-sm border border-input bg-background px-3 text-sm tabular-nums outline-none focus:border-ring"
                />
                <span className="mt-1 block text-xs text-muted-foreground">Ajuste técnico excepcional para esta simulação.</span>
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
        </div>
      </div>
    </>
  );
}

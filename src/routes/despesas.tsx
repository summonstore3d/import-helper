import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Download, Plus, Truck, Upload } from "lucide-react";
import { isNum, money, pct } from "@/lib/format";
import { CONTAS_DO_FRETE, despesasPonderadas, ehContaDoFrete, totaisPorMes } from "@/lib/correcoes";
import { exportarDespesasExcel } from "@/lib/planilha-despesas";
import { KPI, PageHeader, Panel, RealTag, Td, Th } from "@/components/ui-kit";
import { usePrototype } from "@/state/prototype";
import { EditLockBanner } from "@/components/EditLockBanner";
import { ImportarDre } from "@/components/ImportarDre";
import { anoDoArquivo, lerDreGerencial, type MesDre } from "@/lib/importar-dre";
import type { Despesas as Demonstrativo } from "@/data";
import { SincronizacaoDre, type EstadoSincronizacaoDre } from "@/components/SincronizacaoDre";

const MESES = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];

function NovoMesForm({
  existentes,
  onAdicionar,
  onCancelar,
}: {
  existentes: string[];
  onAdicionar: (competencia: string) => void;
  onCancelar: () => void;
}) {
  const hoje = new Date();
  const [mes, setMes] = useState(MESES[hoje.getMonth()]);
  const [ano, setAno] = useState(String(hoje.getFullYear()));
  const competencia = `${mes}/${ano}`;
  const anoValido = /^\d{4}$/.test(ano);
  const duplicado = existentes.some((m) => m.trim().toUpperCase() === competencia);
  return (
    <form
      className="mt-4 flex flex-wrap items-end gap-3 rounded-md border border-border bg-card px-4 py-3 shadow-panel"
      onSubmit={(e) => {
        e.preventDefault();
        if (anoValido && !duplicado) onAdicionar(competencia);
      }}
    >
      <label className="space-y-1 text-xs font-semibold">
        <span className="block">Mês</span>
        <select value={mes} onChange={(e) => setMes(e.target.value)} className="h-8 rounded-sm border border-input bg-background px-2 text-sm">
          {MESES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </label>
      <label className="space-y-1 text-xs font-semibold">
        <span className="block">Ano</span>
        <input value={ano} onChange={(e) => setAno(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" className="h-8 w-20 rounded-sm border border-input bg-background px-2 text-sm" />
      </label>
      <button type="submit" disabled={!anoValido || duplicado} className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-40">
        <Plus className="size-4" /> Adicionar {competencia}
      </button>
      <button type="button" onClick={onCancelar} className="h-8 rounded-sm px-3 text-sm font-semibold text-muted-foreground">Cancelar</button>
      {duplicado ? <p className="w-full text-xs font-semibold text-destructive">A competência {competencia} já existe no demonstrativo.</p> : null}
      {!anoValido ? <p className="w-full text-xs font-semibold text-destructive">Informe o ano com 4 dígitos.</p> : null}
    </form>
  );
}

export const Route = createFileRoute("/despesas")({
  head: () => ({
    meta: [
      { title: "Despesas mensais — D'AGOSTINI" },
      {
        name: "description",
        content:
          "Demonstrativo de resultado mês a mês: custo de mercadoria, despesas administrativas, comerciais e o percentual médio aplicado no preço.",
      },
      { property: "og:title", content: "Despesas mensais — D'AGOSTINI" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        property: "og:description",
        content: "De onde sai o percentual de despesas operacionais usado na precificação.",
      },
    ],
  }),
  component: Despesas,
});

function Despesas() {
  const {
    demonstrativo,
    importarDemonstrativo,
    metodoDespesas,
    definirMetodoDespesas,
    despesasPercentual,
    adicionarMesDespesas,
    atualizarDespesa,
    autenticado,
    sincronizando,
  } = usePrototype();
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [novoMes, setNovoMes] = useState("");
  const dreRef = useRef<HTMLInputElement>(null);
  const [dre, setDre] = useState<{ arquivo: string; meses: MesDre[]; ano: number } | null>(null);
  const [sincronizacaoDre, setSincronizacaoDre] = useState<EstadoSincronizacaoDre | null>(null);
  const importacaoPendente = useRef<{ novo: Demonstrativo; arquivo: string; resumo: string } | null>(null);

  async function sincronizarImportacao() {
    const pendente = importacaoPendente.current;
    if (!pendente) return;
    setSincronizacaoDre({ estado: "salvando", arquivo: pendente.arquivo });
    try {
      const confirmado = await importarDemonstrativo(pendente.novo, pendente.arquivo);
      const taxas = despesasPonderadas(confirmado);
      const taxa = metodoDespesas === "media" ? taxas.mediaSimples : taxas.ponderada;
      setSincronizacaoDre({ estado: "salvo", arquivo: pendente.arquivo, taxa: pct(taxa, 4) });
      setAviso({ tipo: "ok", texto: `Despesas sincronizadas. ${pendente.resumo}` });
      importacaoPendente.current = null;
    } catch (erro) {
      setSincronizacaoDre({ estado: "erro", arquivo: pendente.arquivo, mensagem: erro instanceof Error ? erro.message : "Não foi possível sincronizar as despesas." });
    }
  }

  async function lerDre(arquivo: File) {
    try {
      const meses = await lerDreGerencial(arquivo);
      setDre({ arquivo: arquivo.name, meses, ano: anoDoArquivo(arquivo.name) ?? new Date().getFullYear() });
      setAviso(null);
    } catch (e) {
      setAviso({ tipo: "erro", texto: e instanceof Error ? e.message : "Não foi possível ler o DRE." });
    }
  }

  const vigentes = useMemo(() => despesasPonderadas(demonstrativo), [demonstrativo]);
  const totais = useMemo(() => totaisPorMes(demonstrativo), [demonstrativo]);
  const faturamentoPorMes = useMemo(
    () => demonstrativo.rodape.find((r) => r.nome.toLowerCase().includes("faturamento"))?.valores ?? [],
    [demonstrativo],
  );
  const fretePorMes = useMemo(
    () =>
      demonstrativo.meses.map((_, j) =>
        demonstrativo.linhas.reduce(
          (soma, l) => (ehContaDoFrete(l.nome) && isNum(l.valores[j]?.valor) ? soma + l.valores[j].valor : soma),
          0,
        ),
      ),
    [demonstrativo],
  );
  const mesesComDado = demonstrativo.linhas[0]?.valores.filter((v) => isNum(v.valor)).length ?? 0;


  function exportarExcel() {
    exportarDespesasExcel(demonstrativo);
    setAviso({
      tipo: "ok",
      texto:
        "Planilha Excel exportada com uma coluna por mês, no padrão de formatação da empresa. Guarde como backup ou envie para conferência.",
    });
  }


  return (
    <>
      <PageHeader
        titulo="Despesas Operacionais"
        aba="Despesas"
        descricao="O demonstrativo mensal alimenta o percentual de despesas usado na precificação. No sistema, este número deixa de ser digitado e passa a ser calculado a partir do resultado contábil."
        acoes={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!autenticado}
              title={autenticado ? "Adicionar mês" : "Entre na sua conta para editar"}
              onClick={() => setNovoMes(novoMes ? "" : "aberto")}
              className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-border px-3 text-sm font-semibold disabled:opacity-40"
            >
              <Plus className="size-4" /> Novo mês
            </button>
            <button
              type="button"
              disabled={!autenticado}
              title={autenticado ? "Importar o DRE Gerencial do mês" : "Entre na sua conta para editar"}
              onClick={() => dreRef.current?.click()}
              className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              <Upload className="size-4" /> Importar DRE mensal
            </button>
            <input
              ref={dreRef}
              type="file"
              accept=".xlsx,.xlsm,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void lerDre(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={exportarExcel}
              className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-border px-3 text-sm font-semibold"
            >
              <Download className="size-4" /> Exportar Excel
            </button>
          </div>
        }
      />
      <EditLockBanner />
      <SincronizacaoDre estado={sincronizacaoDre} onFechar={() => setSincronizacaoDre(null)} onTentarNovamente={() => { void sincronizarImportacao(); }} />

      {autenticado && dre ? (
        <ImportarDre
          key={dre.arquivo + dre.ano}
          arquivo={dre.arquivo}
          meses={dre.meses}
          anoInicial={dre.ano}
          base={demonstrativo}
          onCancelar={() => setDre(null)}
          onConfirmar={(novo, resumo) => {
            importacaoPendente.current = { novo, arquivo: dre.arquivo, resumo };
            setDre(null);
            void sincronizarImportacao();
          }}
        />
      ) : null}

      {autenticado && novoMes ? (
        <NovoMesForm
          existentes={demonstrativo.meses}
          onCancelar={() => setNovoMes("")}
          onAdicionar={(competencia) => {
            adicionarMesDespesas(competencia);
            setNovoMes("");
            setAviso({ tipo: "ok", texto: `Mês ${competencia} adicionado ao final do demonstrativo, com valores vazios para preenchimento.` });
          }}
        />
      ) : null}

      {aviso && (
        <p
          className={`mt-4 rounded-md border px-3 py-2 text-sm ${
            aviso.tipo === "ok"
              ? "border-border bg-secondary/40"
              : "border-destructive bg-destructive/10 text-destructive"
          }`}
        >
          {aviso.texto}
        </p>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <KPI rotulo="Meses no demonstrativo" valor={String(demonstrativo.meses.length)} detalhe={`${mesesComDado} meses fechados`} />
        <KPI rotulo="Linhas de conta" valor={String(demonstrativo.linhas.length)} />
        <KPI
          rotulo="% de despesas aplicado no preço"
          valor={pct(despesasPercentual, 4)}
          detalhe={
            metodoDespesas === "media"
              ? "Média simples das razões mensais (método da planilha)"
              : `Taxa ponderada: ${money(vigentes.somaDespesas)} de despesa sobre ${money(
                  vigentes.somaReceita,
                )} de receita em ${vigentes.meses} meses`
          }
          destaque
        />
      </div>

      <Panel
        className="mt-4"
        titulo="Parâmetro: forma de cálculo do percentual de despesas"
        subtitulo="Escolha o método usado na precificação. Serve para comparar o resultado dos dois critérios."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              {
                id: "ponderado" as const,
                titulo: "Taxa ponderada (recomendada)",
                formula: "Σ despesas ÷ Σ receitas dos meses fechados",
                valor: vigentes.ponderada,
                nota: "Meses de faturamento maior pesam mais no resultado.",
              },
              {
                id: "media" as const,
                titulo: "Média simples (planilha original)",
                formula: "média das razões despesa ÷ receita de cada mês",
                valor: vigentes.mediaSimples,
                nota: "Todos os meses pesam igual, mesmo os de faturamento baixo.",
              },
            ]
          ).map((op) => (
            <label
              key={op.id}
              className={`flex cursor-pointer flex-col gap-1 rounded-sm border px-3 py-2.5 text-sm ${
                metodoDespesas === op.id
                  ? "border-green bg-green-soft"
                  : "border-border bg-secondary/40"
              }`}
            >
              <span className="flex items-center gap-2 font-semibold">
                <input
                  type="radio"
                  name="metodo-despesas"
                  checked={metodoDespesas === op.id}
                  onChange={() => definirMetodoDespesas(op.id)}
                />
                {op.titulo}
              </span>
              <span className="text-lg font-bold tabular-nums">{pct(op.valor, 4)}</span>
              <span className="text-xs text-muted-foreground">{op.formula}</span>
              <span className="text-xs text-muted-foreground">{op.nota}</span>
            </label>
          ))}
        </div>
        <p className="mt-3 rounded-md border border-warn bg-demo px-3 py-2 text-sm text-demo-foreground">
          Diferença entre os dois métodos: <strong>{pct(vigentes.diferenca, 4)}</strong>. O método
          escolhido aqui passa a alimentar a tela de Precificação.
        </p>
      </Panel>

      <Panel
        className="mt-4"
        titulo="Demonstrativo mensal"
        subtitulo="Valores por conta. Totais e percentuais são recalculados automaticamente a partir das contas. A linha verde é a % mensal usada no cálculo do preço."
        acoes={<RealTag />}
        bodyClassName="p-0"
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-secondary/30 px-4 py-2.5 text-xs">
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <Truck className="size-3.5 text-warn" /> Não entram no % de despesas (já estão no frete):
          </span>
          {[...CONTAS_DO_FRETE].map((conta) => (
            <span key={conta} className="rounded-full border border-warn bg-demo px-2 py-0.5 font-medium text-demo-foreground">
              {conta}
            </span>
          ))}
        </div>
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <Th className="left-0 z-20">Conta</Th>
                {demonstrativo.meses.map((m) => (
                  <Th key={m} align="right">
                    {m.slice(0, 3)}
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {demonstrativo.linhas.map((l, i) => {
                if (l.tipo === "grupo") {
                  const somas = totais.porGrupo.get(l.nome) ?? [];
                  return (
                    <tr key={`${l.nome}-${i}`} className="bg-table-group font-semibold">
                      <Td className="max-w-[16rem] truncate">{l.nome}</Td>
                      {demonstrativo.meses.map((_, j) => (
                        <Td key={j} align="right" className="whitespace-nowrap tabular-nums">
                          {somas[j] ? money(somas[j]) : "–"}
                        </Td>
                      ))}
                    </tr>
                  );
                }
                const noFrete = ehContaDoFrete(l.nome);
                return (
                  <tr key={`${l.nome}-${i}`} className={noFrete ? "bg-demo/60" : "odd:bg-secondary/30"}>
                    <Td className="max-w-[16rem] truncate">
                      <span className="inline-flex items-center gap-1.5">
                        {l.nome}
                        {noFrete ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-warn bg-demo px-1.5 py-px text-[10px] font-semibold text-demo-foreground">
                            <Truck className="size-3" /> já no frete
                          </span>
                        ) : null}
                      </span>
                    </Td>
                    {l.valores.map((v, j) => (
                      <Td key={j} align="right" className="whitespace-nowrap">
                        {autenticado && l.nome !== "MOI logística" ? (
                          <input
                            aria-label={`${l.nome} — ${demonstrativo.meses[j] ?? "mês"}`}
                            type="number"
                            step="0.01"
                            value={v.valor ?? ""}
                            disabled={sincronizando}
                            onChange={(e) => atualizarDespesa(i, j, e.target.value === "" ? null : Number(e.target.value))}
                            className="h-7 w-28 rounded-sm border border-transparent bg-transparent px-1 text-right tabular-nums hover:border-input focus:border-ring focus:bg-background focus:outline-none"
                          />
                        ) : isNum(v.valor) ? money(v.valor) : "–"}
                      </Td>
                    ))}
                  </tr>
                );
              })}
              <tr className="bg-table-total font-bold">
                <Td>Total despesas VAR por mês (calculado)</Td>
                {totais.variaveis.map((v, j) => (
                  <Td key={j} align="right" className="whitespace-nowrap tabular-nums">{v ? money(v) : "–"}</Td>
                ))}
              </tr>
              <tr className="bg-table-total font-bold">
                <Td>Total despesas PES por mês (calculado)</Td>
                {totais.pessoal.map((v, j) => (
                  <Td key={j} align="right" className="whitespace-nowrap tabular-nums">{v ? money(v) : "–"}</Td>
                ))}
              </tr>
              <tr className="bg-table-total font-bold">
                <Td>Total despesas OP por mês (calculado)</Td>
                {totais.operacionais.map((v, j) => (
                  <Td key={j} align="right" className="whitespace-nowrap tabular-nums">{v ? money(v) : "–"}</Td>
                ))}
              </tr>
              <tr className="bg-table-total font-bold">
                <Td>Total de despesas por mês (calculado)</Td>
                {totais.total.map((v, j) => (
                  <Td key={j} align="right" className="whitespace-nowrap tabular-nums">{v ? money(v) : "–"}</Td>
                ))}
              </tr>
              <tr className="bg-table-total font-bold">
                <Td>Faturamento por mês (informado)</Td>
                {faturamentoPorMes.map((v, j) => (
                  <Td key={j} align="right" className="whitespace-nowrap tabular-nums">{isNum(v) ? money(v) : "–"}</Td>
                ))}
              </tr>
              <tr className="bg-table-total font-bold">
                <Td>Despesas (%) bruta — inclui frota</Td>
                {totais.total.map((v, j) => {
                  const fat = faturamentoPorMes[j];
                  return (
                    <Td key={j} align="right" className="whitespace-nowrap tabular-nums">
                      {v && isNum(fat) && fat > 0 ? pct(v / fat, 2) : "–"}
                    </Td>
                  );
                })}
              </tr>
              <tr className="bg-demo font-semibold text-demo-foreground">
                <Td>
                  <span className="inline-flex items-center gap-1.5">
                    <Truck className="size-3.5" /> (−) Já incluídas no frete
                  </span>
                </Td>
                {fretePorMes.map((v, j) => (
                  <Td key={j} align="right" className="whitespace-nowrap tabular-nums">{v ? money(-v) : "–"}</Td>
                ))}
              </tr>
              <tr className="bg-green-soft font-bold">
                <Td>Despesas (%) aplicada — sem frota</Td>
                {vigentes.taxasPorMes.map((v, j) => (
                  <Td key={j} align="right" className="whitespace-nowrap">
                    {isNum(v) ? pct(v, 2) : "–"}
                  </Td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

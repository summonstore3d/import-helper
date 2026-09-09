import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Download, Pencil, Plus, Search, SlidersHorizontal, Upload } from "lucide-react";
import { bom } from "@/data";
import { isNum, money, moneyPreciso, qtd } from "@/lib/format";
import { KPI, PageHeader, Panel, RealTag, Td, Th } from "@/components/ui-kit";
import { usePrototype } from "@/state/prototype";
import { exportarInsumosExcel, importarInsumosExcel } from "@/lib/planilha-insumos";

export const Route = createFileRoute("/insumos")({
  head: () => ({
    meta: [
      { title: "Insumos — Protótipo de Precificação" },
      {
        name: "description",
        content:
          "Cadastro de insumos reais (cimento, areia, ferro, aditivos) com custo unitário e uso nas estruturas de produto.",
      },
      { property: "og:title", content: "Insumos — Protótipo de Precificação" },
      {
        property: "og:description",
        content: "Custo unitário de cada insumo e em quantos produtos ele é consumido.",
      },
    ],
  }),
  component: Insumos,
});

type ColunaId = "codigo" | "descricao" | "custoUnitario" | "unidade" | "produtos" | "consumo" | "custoAcumulado";

const COLUNAS: { id: ColunaId; rotulo: string }[] = [
  { id: "codigo", rotulo: "Código" },
  { id: "descricao", rotulo: "Descrição" },
  { id: "custoUnitario", rotulo: "Custo unitário" },
  { id: "unidade", rotulo: "Unidade" },
  { id: "produtos", rotulo: "Produtos que usam" },
  { id: "consumo", rotulo: "Consumo total (BOM)" },
  { id: "custoAcumulado", rotulo: "Custo acumulado" },
];

const VISIVEIS_PADRAO: Record<ColunaId, boolean> = {
  codigo: true,
  descricao: true,
  custoUnitario: true,
  unidade: true,
  produtos: false,
  consumo: false,
  custoAcumulado: false,
};

type Formulario = {
  fullOriginal?: string;
  codigo: string;
  descricao: string;
  custoUnitario: string;
};

function Insumos() {
  const { listaInsumos, salvarInsumo, importarInsumos } = usePrototype();
  const inputRef = useRef<HTMLInputElement>(null);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [busca, setBusca] = useState("");
  const [visiveis, setVisiveis] = useState<Record<ColunaId, boolean>>(VISIVEIS_PADRAO);
  const [painelColunas, setPainelColunas] = useState(false);
  const [form, setForm] = useState<Formulario | null>(null);

  const linhas = useMemo(() => {
    const uso = new Map<string, { produtos: Set<string>; consumo: number; custo: number }>();
    for (const l of bom) {
      const at = uso.get(l.item) ?? { produtos: new Set<string>(), consumo: 0, custo: 0 };
      at.produtos.add(l.produto);
      at.consumo += isNum(l.quantidade) ? l.quantidade : 0;
      at.custo += isNum(l.custoTotal) ? l.custoTotal : 0;
      uso.set(l.item, at);
    }
    return listaInsumos
      .map((i) => {
        const u = uso.get(i.full);
        return {
          ...i,
          produtos: u?.produtos.size ?? 0,
          consumo: u?.consumo ?? 0,
          custoAcumulado: u?.custo ?? 0,
          unidade: bom.find((l) => l.item === i.full)?.unidade ?? "—",
        };
      })
      .sort((a, b) => b.custoAcumulado - a.custoAcumulado);
  }, [listaInsumos]);

  const filtradas = linhas.filter((l) => l.full.toLowerCase().includes(busca.toLowerCase()));
  const semCusto = linhas.filter((l) => !isNum(l.custoUnitario)).length;
  const semUso = linhas.filter((l) => l.produtos === 0).length;

  const mostrar = (id: ColunaId) => visiveis[id];

  function enviar() {
    if (!form) return;
    const codigo = form.codigo.trim();
    const descricao = form.descricao.trim();
    if (!codigo || !descricao) return;
    const bruto = form.custoUnitario.replace(/\./g, "").replace(",", ".").trim();
    const custo = bruto === "" ? null : Number(bruto);
    salvarInsumo(
      { codigo, descricao, custoUnitario: Number.isFinite(custo as number) ? custo : null },
      form.fullOriginal,
    );
    setForm(null);
  }

  function exportarExcel() {
    exportarInsumosExcel(
      linhas.map((l) => ({
        codigo: l.codigo,
        descricao: l.descricao,
        full: l.full,
        custoUnitario: l.custoUnitario,
        unidade: l.unidade,
      })),
    );
    setAviso({
      tipo: "ok",
      texto:
        "Planilha de insumos exportada. Ajuste os custos unitários no Excel sem renomear o cabeçalho e importe o arquivo de volta.",
    });
  }

  async function importarExcel(arquivo: File) {
    try {
      const { entradas, problemas } = await importarInsumosExcel(arquivo);
      const { atualizados, novos } = importarInsumos(entradas, arquivo.name);
      const partes = [
        `${atualizados} insumos atualizados`,
        novos ? `${novos} novos cadastrados` : "",
        problemas.length ? `${problemas.length} linhas ignoradas: ${problemas[0]}` : "",
      ].filter(Boolean);
      setAviso({
        tipo: problemas.length ? "erro" : "ok",
        texto: `Planilha "${arquivo.name}" importada — ${partes.join(", ")}.`,
      });
    } catch (e) {
      setAviso({
        tipo: "erro",
        texto: e instanceof Error ? e.message : "Não foi possível ler a planilha.",
      });
    }
  }

  return (
    <>
      <PageHeader
        titulo="Insumos"
        aba="Insumos"
        descricao="Base única de custos de matéria-prima. Quando um insumo é atualizado aqui, todos os produtos que o consomem são reprecificados — sem propagar fórmulas manualmente."
        acoes={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportarExcel}
              className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-border px-3 text-sm font-semibold"
            >
              <Download className="size-4" /> Exportar Excel
            </button>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-border px-3 text-sm font-semibold"
            >
              <Upload className="size-4" /> Importar Excel
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importarExcel(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => setForm({ codigo: "", descricao: "", custoUnitario: "" })}
              className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-primary px-3 text-sm font-semibold text-primary-foreground"
            >
              <Plus className="size-4" /> Novo insumo
            </button>
          </div>
        }
      />

      {aviso ? (
        <p
          className={`mb-4 rounded-md border px-3 py-2 text-sm ${
            aviso.tipo === "ok"
              ? "border-border bg-secondary/40"
              : "border-destructive bg-destructive/10 text-destructive"
          }`}
        >
          {aviso.texto}
        </p>
      ) : null}


      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPI rotulo="Insumos cadastrados" valor={qtd(listaInsumos.length)} />
        <KPI rotulo="Sem custo unitário" valor={qtd(semCusto)} detalhe="Bloqueia o cálculo do preço" />
        <KPI rotulo="Sem uso em estruturas" valor={qtd(semUso)} detalhe="Possível cadastro obsoleto" />
        <KPI
          rotulo="Custo acumulado nas estruturas"
          valor={money(linhas.reduce((s, l) => s + l.custoAcumulado, 0))}
          detalhe="Soma de todas as linhas de BOM"
          destaque
        />
      </div>

      {form ? (
        <Panel
          className="mt-4"
          titulo={form.fullOriginal ? "Editar insumo" : "Novo insumo"}
          subtitulo="Código, descrição e custo unitário alimentam o custeio das estruturas"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Código
              <input
                value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                className="mt-1 h-8 w-full rounded-sm border border-input bg-background px-2 text-sm font-normal text-foreground normal-case outline-none focus:border-ring"
              />
            </label>
            <label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Descrição
              <input
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                className="mt-1 h-8 w-full rounded-sm border border-input bg-background px-2 text-sm font-normal text-foreground normal-case outline-none focus:border-ring"
              />
            </label>
            <label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Custo unitário (R$)
              <input
                value={form.custoUnitario}
                onChange={(e) => setForm({ ...form, custoUnitario: e.target.value })}
                inputMode="decimal"
                placeholder="0,00"
                className="mt-1 h-8 w-full rounded-sm border border-input bg-background px-2 text-sm font-normal text-foreground normal-case outline-none focus:border-ring"
              />
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={enviar}
              className="h-8 rounded-sm bg-primary px-3 text-sm font-semibold text-primary-foreground"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="h-8 rounded-sm border border-border px-3 text-sm font-semibold text-foreground"
            >
              Cancelar
            </button>
          </div>
        </Panel>
      ) : null}

      <Panel
        className="mt-4"
        titulo={`${qtd(filtradas.length)} insumos`}
        subtitulo="Ordenados pelo peso no custo total das estruturas"
        acoes={
          <>
            <RealTag />
            <div className="relative">
              <button
                type="button"
                onClick={() => setPainelColunas((v) => !v)}
                className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-border px-2 text-sm text-foreground"
              >
                <SlidersHorizontal className="size-4" /> Colunas
              </button>
              {painelColunas ? (
                <div className="absolute right-0 z-20 mt-1 w-60 rounded-md border border-border bg-card p-2 shadow-panel">
                  {COLUNAS.map((c) => (
                    <label
                      key={c.id}
                      className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-sm hover:bg-secondary/60"
                    >
                      <input
                        type="checkbox"
                        checked={visiveis[c.id]}
                        onChange={(e) => setVisiveis({ ...visiveis, [c.id]: e.target.checked })}
                      />
                      {c.rotulo}
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute top-2 left-2 size-4 text-muted-foreground" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar insumo"
                className="h-8 w-52 rounded-sm border border-input bg-background pr-2 pl-8 text-sm outline-none focus:border-ring"
              />
            </div>
          </>
        }
        bodyClassName="p-0"
      >
        <div className="max-h-[62vh] overflow-auto">
          <table className="w-full">
            <thead>
              <tr>
                {mostrar("codigo") ? <Th>Código</Th> : null}
                {mostrar("descricao") ? <Th>Descrição</Th> : null}
                {mostrar("custoUnitario") ? <Th align="right">Custo unitário</Th> : null}
                {mostrar("unidade") ? <Th>Unidade</Th> : null}
                {mostrar("produtos") ? <Th align="right">Produtos que usam</Th> : null}
                {mostrar("consumo") ? <Th align="right">Consumo total (BOM)</Th> : null}
                {mostrar("custoAcumulado") ? <Th align="right">Custo acumulado</Th> : null}
                <Th align="right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((l) => (
                <tr key={l.full} className="odd:bg-secondary/30">
                  {mostrar("codigo") ? <Td className="font-semibold">{l.codigo}</Td> : null}
                  {mostrar("descricao") ? (
                    <Td className="max-w-[24rem] truncate">{l.descricao}</Td>
                  ) : null}
                  {mostrar("custoUnitario") ? (
                    <Td align="right">{moneyPreciso(l.custoUnitario)}</Td>
                  ) : null}
                  {mostrar("unidade") ? <Td>{l.unidade}</Td> : null}
                  {mostrar("produtos") ? <Td align="right">{qtd(l.produtos)}</Td> : null}
                  {mostrar("consumo") ? <Td align="right">{qtd(l.consumo)}</Td> : null}
                  {mostrar("custoAcumulado") ? (
                    <Td align="right" className="font-semibold">
                      {money(l.custoAcumulado)}
                    </Td>
                  ) : null}
                  <Td align="right">
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          fullOriginal: l.full,
                          codigo: l.codigo,
                          descricao: l.descricao,
                          custoUnitario:
                            l.custoUnitario === null
                              ? ""
                              : String(l.custoUnitario).replace(".", ","),
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-sm border border-border px-2 py-0.5 text-xs font-semibold text-foreground"
                    >
                      <Pencil className="size-3" /> Editar
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

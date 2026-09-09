import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { isNum, money, pct } from "@/lib/format";
import { despesasPonderadas } from "@/lib/correcoes";
import {
  baixarArquivo,
  csvParaDespesas,
  despesasParaCsv,
  exportarDespesasExcel,
  importarDespesasExcel,
} from "@/lib/planilha-despesas";
import { KPI, PageHeader, Panel, RealTag, Td, Th } from "@/components/ui-kit";
import { usePrototype } from "@/state/prototype";

export const Route = createFileRoute("/despesas")({
  head: () => ({
    meta: [
      { title: "Despesas — Demonstrativo de 12 Meses" },
      {
        name: "description",
        content:
          "Demonstrativo de resultado dos últimos 12 meses: custo de mercadoria, despesas administrativas, comerciais e o percentual médio aplicado no preço.",
      },
      { property: "og:title", content: "Despesas — Demonstrativo de 12 Meses" },
      {
        property: "og:description",
        content: "De onde sai o percentual de despesas operacionais usado na precificação.",
      },
    ],
  }),
  component: Despesas,
});

function Despesas() {
  const { demonstrativo, importarDemonstrativo } = usePrototype();
  const inputRef = useRef<HTMLInputElement>(null);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const vigentes = useMemo(() => despesasPonderadas(demonstrativo), [demonstrativo]);
  const mesesComDado = demonstrativo.linhas[0]?.valores.filter((v) => isNum(v.valor)).length ?? 0;

  function exportar() {
    baixarArquivo("demonstrativo-mensal.csv", despesasParaCsv(demonstrativo));
    setAviso({
      tipo: "ok",
      texto:
        "Planilha exportada. Preencha os valores no Excel mantendo as colunas Tipo e Conta e depois importe o arquivo de volta.",
    });
  }

  function exportarExcel() {
    exportarDespesasExcel(demonstrativo);
    setAviso({
      tipo: "ok",
      texto:
        "Planilha Excel exportada com uma coluna por mês. Preencha os valores mantendo as colunas Tipo e Conta e importe o arquivo de volta.",
    });
  }

  async function importar(arquivo: File) {
    try {
      const resultado = arquivo.name.toLowerCase().endsWith(".xlsx")
        ? await importarDespesasExcel(arquivo, demonstrativo)
        : csvParaDespesas(await arquivo.text(), demonstrativo);
      importarDemonstrativo(resultado.despesas, arquivo.name);
      setAviso({
        tipo: "ok",
        texto: `Planilha "${arquivo.name}" importada: ${resultado.linhasAtualizadas} contas atualizadas${
          resultado.linhasIgnoradas.length
            ? `, ${resultado.linhasIgnoradas.length} mantidas como estavam (não encontradas no arquivo)`
            : ""
        }.`,
      });
    } catch (e) {
      setAviso({ tipo: "erro", texto: e instanceof Error ? e.message : "Não foi possível ler a planilha." });
    }
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
              onClick={exportarExcel}
              className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-border px-3 text-sm font-semibold"
            >
              <Download className="size-4" /> Exportar Excel
            </button>
            <button
              type="button"
              onClick={exportar}
              className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-border px-3 text-sm font-semibold"
            >
              <Download className="size-4" /> Exportar CSV
            </button>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-primary px-3 text-sm font-semibold text-primary-foreground"
            >
              <Upload className="size-4" /> Importar planilha (Excel ou CSV)
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importar(f);
                e.target.value = "";
              }}
            />
          </div>
        }
      />

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
          valor={pct(vigentes.ponderada, 4)}
          detalhe={`Taxa ponderada: ${money(vigentes.somaDespesas)} de despesa sobre ${money(
            vigentes.somaReceita,
          )} de receita em ${vigentes.meses} meses`}
          destaque
        />
      </div>

      <p className="mt-4 rounded-md border border-warn bg-demo px-3 py-2 text-sm text-demo-foreground">
        <strong>Correção aplicada:</strong> a planilha usava a média simples das razões mensais (
        {pct(vigentes.mediaSimples, 4)}), dando o mesmo peso a meses de faturamento alto e baixo. O
        sistema usa a taxa ponderada (soma das despesas ÷ soma das receitas): {pct(vigentes.ponderada, 4)}{" "}
        — diferença de {pct(vigentes.diferenca, 4)}.
      </p>

      <Panel
        className="mt-4"
        titulo="Demonstrativo mensal"
        subtitulo="Valores e participação sobre a receita, por conta. Exporte, preencha no Excel e importe de volta."
        acoes={<RealTag />}
        bodyClassName="p-0"
      >
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
              {demonstrativo.linhas.map((l, i) => (
                <tr
                  key={`${l.nome}-${i}`}
                  className={l.tipo === "grupo" ? "bg-table-group font-semibold" : "odd:bg-secondary/30"}
                >
                  <Td className="max-w-[16rem] truncate">{l.nome}</Td>
                  {l.valores.map((v, j) => (
                    <Td key={j} align="right" className="whitespace-nowrap">
                      {isNum(v.valor) ? money(v.valor) : "–"}
                    </Td>
                  ))}
                </tr>
              ))}
              {demonstrativo.rodape.map((r, i) => (
                <tr key={`${r.nome}-${i}`} className="bg-table-total font-bold">
                  <Td>{r.nome}</Td>
                  {r.valores.map((v, j) => (
                    <Td key={j} align="right" className="whitespace-nowrap">
                      {isNum(v) ? (Math.abs(v) < 1 ? pct(v, 2) : money(v)) : "–"}
                    </Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

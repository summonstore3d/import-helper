import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Printer, ClipboardCopy, Check } from "lucide-react";
import { Panel, SeverityTag, TableWrap, Td, Th } from "@/components/ui-kit";

export const Route = createFileRoute("/relatorio")({
  head: () => ({
    meta: [
      { title: "Relatório Técnico — Auditoria e Modernização da Precificação" },
      {
        name: "description",
        content:
          "Relatório técnico completo da auditoria da ferramenta de precificação D'AGOSTINI: erros corrigidos, fórmulas revisadas, impacto no preço final e novo padrão de planilhas Excel.",
      },
      {
        property: "og:title",
        content: "Relatório Técnico — Auditoria e Modernização da Precificação",
      },
      {
        property: "og:description",
        content:
          "Matriz dos 8 erros corrigidos, fórmulas revisadas, impacto no preço e recomendações de implantação.",
      },
    ],
  }),
  component: RelatorioTecnico,
});

type Erro = {
  id: string;
  titulo: string;
  severidade: "CRÍTICO" | "ALTO" | "MÉDIO" | "BAIXO";
  modulo: string;
  antes: string;
  depois: string;
  impacto: string;
};

const erros: Erro[] = [
  {
    id: "E-01",
    titulo: "Custo de armação multiplicado duas vezes pelas horas",
    severidade: "CRÍTICO",
    modulo: "Centro de Custos",
    antes: "custo = horas × (horas × taxa)",
    depois: "custo = horas × taxa",
    impacto: "Superavaliação do custo de fabricação em produtos com muitas horas de armação.",
  },
  {
    id: "E-02",
    titulo: "Produtos com horas de armação sem fórmula de custo",
    severidade: "CRÍTICO",
    modulo: "Centro de Custos",
    antes: "102 roteiros com horas > 0 e custo em branco",
    depois: "Taxa padrão de armação aplicada, com a linha sinalizada como estimada",
    impacto: "Elimina custo de fabricação subdimensionado em cerca de 40% dos roteiros.",
  },
  {
    id: "E-03",
    titulo: "Referências quebradas entre as colunas M e G",
    severidade: "ALTO",
    modulo: "Centro de Custos",
    antes: "Células apontando para linhas deslocadas",
    depois: "Vínculo produto → setor recalculado a partir do roteiro",
    impacto: "Custos deixam de ser atribuídos ao produto errado.",
  },
  {
    id: "E-04",
    titulo: "Simples Nacional aplicado pela alíquota nominal",
    severidade: "CRÍTICO",
    modulo: "Impostos",
    antes: "Alíquota fixa de 10% sobre a receita",
    depois: "(RBT12 × alíquota nominal − dedução) ÷ RBT12",
    impacto: "Carga tributária real substitui a estimativa nominal do anexo.",
  },
  {
    id: "E-05",
    titulo: "Fallback silencioso de R$ 1.000 para insumo sem custo",
    severidade: "CRÍTICO",
    modulo: "Insumos / BOM",
    antes: "Insumo ausente entrava no cálculo valendo R$ 1.000",
    depois: "Cálculo bloqueado com alerta identificando o item",
    impacto: "Nenhum preço é publicado com valor inventado (ex.: MUR001, MUR002).",
  },
  {
    id: "E-06",
    titulo: "Despesas pela média simples das razões mensais",
    severidade: "ALTO",
    modulo: "Despesas",
    antes: "média(despesa mês ÷ receita mês)",
    depois: "Σ despesas ÷ Σ receitas (taxa ponderada)",
    impacto: "Meses de baixa receita deixam de distorcer o percentual de despesas.",
  },
  {
    id: "E-07",
    titulo: "Consumo de diesel com unidade invertida",
    severidade: "ALTO",
    modulo: "Logística",
    antes: "Parâmetro tratado como L/km",
    depois: "Rendimento de 2,69 km/L, com multiplicadores documentados",
    impacto: "Custo de frete por peça volta à ordem de grandeza real.",
  },
  {
    id: "E-08",
    titulo: "Preço formado por soma de margens em vez de markup divisor",
    severidade: "CRÍTICO",
    modulo: "Precificação",
    antes: "preço = custos × (1 + percentuais)",
    depois: "preço = custos absolutos ÷ (1 − Σ percentuais)",
    impacto: "Margem, comissão, tributos e inadimplência passam a fechar com a DRE.",
  },
];

const formulas = [
  {
    nome: "Custo de fabricação (armação)",
    expressao: "custo_armacao = horas_armacao × taxa_hora_setor",
    nota: "Aplicado uma única vez por roteiro. Quando não há fórmula original, usa-se a taxa padrão do setor e a linha é marcada como estimada.",
  },
  {
    nome: "Alíquota efetiva do Simples Nacional",
    expressao: "aliquota_efetiva = (RBT12 × aliquota_nominal − parcela_deducao) ÷ RBT12",
    nota: "Substitui a alíquota nominal fixa; recalculada sempre que o RBT12 muda.",
  },
  {
    nome: "Percentual de despesas operacionais",
    expressao: "pct_despesas = Σ despesas_12m ÷ Σ receitas_12m",
    nota: "Taxa ponderada agregada; a média simples continua exibida apenas como comparação.",
  },
  {
    nome: "Custo logístico por peça",
    expressao: "custo_frete = (km_viagem ÷ 2,69 km/L) × preço_diesel × fator ÷ peças_por_viagem",
    nota: "Rendimento em km/L, com manutenção e multiplicadores documentados na tela de Logística.",
  },
  {
    nome: "Preço bruto (markup divisor)",
    expressao: "preco_bruto = custos_absolutos ÷ (1 − Σ percentuais)",
    nota: "Percentuais: tributos efetivos, despesas ponderadas, comissão, inadimplência e margem. Exige 0 ≤ Σ < 1.",
  },
];

const impactos = [
  {
    item: "Custo de matéria-prima",
    efeito: "Estável",
    detalhe: "Recalculado dinamicamente a partir da BOM; sobrescritas manuais ficam sinalizadas.",
  },
  {
    item: "Custo de fabricação",
    efeito: "Redução nos produtos com dupla contagem / aumento nos sem fórmula",
    detalhe: "Corrige simultaneamente superavaliação (E-01) e subavaliação (E-02).",
  },
  {
    item: "Despesas operacionais",
    efeito: "Percentual mais baixo e estável",
    detalhe: "Taxa ponderada elimina o peso desproporcional de meses fracos.",
  },
  {
    item: "Tributos",
    efeito: "Alinhado ao faturamento real",
    detalhe: "Alíquota efetiva do Simples no lugar dos 10% nominais.",
  },
  {
    item: "Preço final sugerido",
    efeito: "Consistente com a DRE",
    detalhe: "Markup divisor garante que a margem-alvo sobre a receita seja de fato realizada.",
  },
];

const recomendacoes = [
  "Migrar os cadastros da planilha para banco relacional com integridade referencial entre produto, insumo, estrutura e roteiro.",
  "Manter o bloqueio de preço quando faltar custo de insumo — nunca substituir por valor padrão.",
  "Revisar mensalmente o RBT12 e a parcela de dedução do Simples Nacional.",
  "Padronizar a atualização de custos pelo novo modelo Excel, preservando a trilha de auditoria.",
  "Registrar aprovação de margem e comissão por perfil, com histórico de vigência.",
  "Integrar o consumo de diesel e as viagens ao controle de frota para atualizar o frete por peça automaticamente.",
];

const markdown = `# Relatório Técnico — Auditoria e Modernização do Sistema de Precificação
D'AGOSTINI — Indústria de Concreto

## 1. Sumário executivo
A auditoria da ferramenta de precificação identificou 8 erros estruturais, sendo 5 críticos,
que afetavam diretamente o preço final sugerido. Todos foram corrigidos no protótipo web,
com as fórmulas centralizadas, validações de integridade e bloqueio de cálculo quando faltam dados.

## 2. Matriz comparativa dos erros
${erros
  .map(
    (e) =>
      `- **${e.id} (${e.severidade}) — ${e.titulo}** [${e.modulo}]\n  - Antes: ${e.antes}\n  - Depois: ${e.depois}\n  - Impacto: ${e.impacto}`,
  )
  .join("\n")}

## 3. Fórmulas corrigidas
${formulas.map((f) => `- **${f.nome}**: \`${f.expressao}\`\n  - ${f.nota}`).join("\n")}

## 4. Impacto no preço final
${impactos.map((i) => `- **${i.item}** — ${i.efeito}: ${i.detalhe}`).join("\n")}

## 5. Novo padrão de planilhas Excel (.xlsx)
- Cabeçalho azul-marinho corporativo com texto branco em negrito.
- Linhas de totais em verde suave com bordas sutis.
- Larguras de coluna otimizadas e formatos nativos: R$ #,##0.00, 0.00% e #,##0.
- Exportação e importação em Insumos e Despesas; exportação da memória de cálculo em Precificação.
- Validação de colunas obrigatórias, códigos duplicados e valores não numéricos na importação.

## 6. Recomendações
${recomendacoes.map((r) => `- ${r}`).join("\n")}
`;

function RelatorioTecnico() {
  const [copiado, setCopiado] = useState(false);

  async function copiarMarkdown() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div className="relatorio mx-auto max-w-5xl space-y-8">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground uppercase">
            Relatório Técnico
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Auditoria e modernização do sistema de precificação — versão para leitura e impressão.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-sm bg-navy px-4 py-2 text-sm font-semibold text-navy-foreground transition-colors hover:bg-navy-deep"
          >
            <Printer className="size-4" />
            Baixar / Imprimir PDF
          </button>
          <button
            type="button"
            onClick={copiarMarkdown}
            className="inline-flex items-center gap-2 rounded-sm border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            {copiado ? <Check className="size-4" /> : <ClipboardCopy className="size-4" />}
            {copiado ? "Markdown copiado" : "Copiar em Markdown"}
          </button>
        </div>
      </div>

      {/* Cabeçalho corporativo — visível apenas na impressão */}
      <div className="print-header hidden">
        <span className="print-header-marca">D&apos;AGOSTINI</span>
        <span className="print-header-titulo">
          Relatório Técnico — Auditoria e Modernização do Sistema de Precificação
        </span>
      </div>

      {/* Capa institucional */}
      <section className="capa rounded-md border border-border bg-navy px-8 py-14 text-navy-foreground shadow-panel">
        <p className="text-3xl leading-none font-black tracking-tight">D&apos;AGOSTINI</p>
        <p className="mt-2 text-[11px] tracking-[0.3em] text-navy-muted uppercase">
          Indústria de Concreto
        </p>
        <div className="mt-10 border-l-4 border-green pl-5">
          <h2 className="text-3xl leading-tight font-bold">
            Relatório Técnico de Auditoria e Modernização do Sistema de Precificação
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-navy-muted">
            Diagnóstico das fórmulas da planilha &quot;Ferramenta de Precificação Atualizada
            28.08.2026&quot;, correções aplicadas no protótipo web e recomendações para a
            implantação definitiva.
          </p>
        </div>
        <dl className="mt-10 grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-[10px] tracking-widest text-navy-muted uppercase">Base de dados</dt>
            <dd className="mt-1 font-semibold">Planilha 28.08.2026</dd>
          </div>
          <div>
            <dt className="text-[10px] tracking-widest text-navy-muted uppercase">Escopo</dt>
            <dd className="mt-1 font-semibold">8 erros estruturais</dd>
          </div>
          <div>
            <dt className="text-[10px] tracking-widest text-navy-muted uppercase">Destinatário</dt>
            <dd className="mt-1 font-semibold">Diretoria</dd>
          </div>
        </dl>
      </section>

      {/* Sumário executivo */}
      <section className="secao-relatorio space-y-4">
        <Panel titulo="1. Sumário executivo" subtitulo="Visão para decisão da diretoria">
          <div className="space-y-3 text-sm leading-relaxed text-foreground">
            <p>
              A auditoria da ferramenta de precificação identificou{" "}
              <strong>8 erros estruturais</strong>, sendo <strong>5 críticos</strong>, capazes de
              alterar o preço final sugerido tanto para cima quanto para baixo. As falhas iam da
              dupla contagem de horas de armação até a formação de preço sem markup divisor.
            </p>
            <p>
              Todas as correções foram aplicadas no protótipo web: as fórmulas passaram a ser
              calculadas em um único módulo, com validação de integridade, sinalização de dados
              estimados e bloqueio do preço quando um custo obrigatório está ausente — em vez do
              antigo valor padrão silencioso.
            </p>
            <p>
              O resultado é um preço reconciliável com a DRE: cada componente do preço é
              rastreável até o insumo, a hora de setor, a despesa e o tributo que o originou.
            </p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            {[
              { r: "Erros auditados", v: "8" },
              { r: "Críticos", v: "5" },
              { r: "Alta prioridade", v: "3" },
              { r: "Corrigidos", v: "8" },
            ].map((k) => (
              <div key={k.r} className="rounded-md border border-border bg-secondary/50 p-3">
                <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                  {k.r}
                </p>
                <p className="mt-1 text-2xl font-bold text-foreground">{k.v}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      {/* Matriz comparativa */}
      <section className="secao-relatorio quebra-pagina">
        <Panel
          titulo="2. Matriz comparativa dos 8 erros"
          subtitulo="Situação anterior, correção aplicada e efeito prático"
          bodyClassName="p-0"
        >
          <TableWrap>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>ID</Th>
                  <Th>Severidade</Th>
                  <Th>Módulo</Th>
                  <Th>Erro</Th>
                  <Th>Antes</Th>
                  <Th>Depois</Th>
                  <Th>Impacto</Th>
                </tr>
              </thead>
              <tbody>
                {erros.map((e) => (
                  <tr key={e.id} className="odd:bg-muted/40">
                    <Td className="font-semibold">{e.id}</Td>
                    <Td>
                      <SeverityTag nivel={e.severidade} />
                    </Td>
                    <Td>{e.modulo}</Td>
                    <Td className="min-w-[220px]">{e.titulo}</Td>
                    <Td className="min-w-[200px] text-muted-foreground">{e.antes}</Td>
                    <Td className="min-w-[200px]">{e.depois}</Td>
                    <Td className="min-w-[240px] text-muted-foreground">{e.impacto}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Panel>
      </section>

      {/* Fórmulas */}
      <section className="secao-relatorio quebra-pagina">
        <Panel
          titulo="3. Detalhamento das fórmulas corrigidas"
          subtitulo="Expressões efetivamente implementadas no motor de cálculo"
        >
          <ol className="space-y-4">
            {formulas.map((f, i) => (
              <li key={f.nome} className="rounded-md border border-border bg-secondary/40 p-4">
                <p className="text-sm font-semibold text-foreground">
                  3.{i + 1} {f.nome}
                </p>
                <p className="mt-2 rounded-sm border border-border bg-card px-3 py-2 font-mono text-[13px] text-foreground">
                  {f.expressao}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">{f.nota}</p>
              </li>
            ))}
          </ol>
        </Panel>
      </section>

      {/* Impacto */}
      <section className="secao-relatorio quebra-pagina">
        <Panel
          titulo="4. Impacto no preço final"
          subtitulo="Como cada bloco de custo se comporta após as correções"
          bodyClassName="p-0"
        >
          <TableWrap>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>Componente</Th>
                  <Th>Efeito</Th>
                  <Th>Detalhe</Th>
                </tr>
              </thead>
              <tbody>
                {impactos.map((i) => (
                  <tr key={i.item} className="odd:bg-muted/40">
                    <Td className="font-semibold">{i.item}</Td>
                    <Td>{i.efeito}</Td>
                    <Td className="text-muted-foreground">{i.detalhe}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
          <div className="border-t border-border bg-table-total px-4 py-3 text-sm font-semibold text-foreground">
            Preço bruto = custos absolutos ÷ (1 − soma dos percentuais). O sistema recusa
            publicar preço quando a soma dos percentuais atinge 100% ou quando falta custo de
            insumo, produção ou tributo.
          </div>
        </Panel>
      </section>

      {/* Padrão Excel */}
      <section className="secao-relatorio quebra-pagina">
        <Panel
          titulo="5. Novo padrão de planilhas Excel (.xlsx)"
          subtitulo="Exportação e importação com identidade visual e validação"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-md border border-border p-4">
              <p className="text-sm font-semibold text-foreground">Diagramação corporativa</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                <li>Cabeçalho azul-marinho com texto branco em negrito.</li>
                <li>Linhas de totais em verde suave com bordas sutis.</li>
                <li>Larguras de coluna otimizadas, sem texto cortado.</li>
                <li>Formatos nativos: R$ #,##0.00, 0.00% e #,##0.</li>
              </ul>
            </div>
            <div className="rounded-md border border-border p-4">
              <p className="text-sm font-semibold text-foreground">Fluxo de trabalho</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                <li>Insumos: exporta o cadastro, edita custos no Excel e reimporta em lote.</li>
                <li>Despesas: exporta e importa o demonstrativo de 12 meses (.xlsx ou .csv).</li>
                <li>Precificação: exporta a memória de cálculo e a composição de matéria-prima.</li>
                <li>Toda importação é registrada na trilha de auditoria.</li>
              </ul>
            </div>
            <div className="rounded-md border border-border p-4 md:col-span-2">
              <p className="text-sm font-semibold text-foreground">Validações na importação</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                <li>Colunas obrigatórias ausentes são identificadas pelo nome na mensagem de erro.</li>
                <li>Códigos duplicados, descrições em branco e custos negativos são recusados.</li>
                <li>Células não numéricas bloqueiam a linha, que é reportada ao usuário.</li>
                <li>Arquivos sem nenhuma linha válida não alteram o estado do sistema.</li>
              </ul>
            </div>
          </div>
        </Panel>
      </section>

      {/* Recomendações */}
      <section className="secao-relatorio quebra-pagina">
        <Panel titulo="6. Recomendações" subtitulo="Próximos passos para a implantação definitiva">
          <ol className="space-y-2">
            {recomendacoes.map((r, i) => (
              <li key={r} className="flex gap-3 text-sm text-foreground">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm bg-navy text-[11px] font-bold text-navy-foreground">
                  {i + 1}
                </span>
                <span>{r}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
            Documento gerado pelo protótipo navegável da Ferramenta de Precificação D&apos;AGOSTINI.
            Não substitui parecer contábil ou fiscal oficial.
          </p>
        </Panel>
      </section>
    </div>
  );
}

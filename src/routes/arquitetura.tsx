import { createFileRoute } from "@tanstack/react-router";
import { bom, insumos, produtos, centroCustos } from "@/data";
import { qtd } from "@/lib/format";
import { PageHeader, Panel, Td, Th } from "@/components/ui-kit";

export const Route = createFileRoute("/arquitetura")({
  head: () => ({
    meta: [
      { title: "Arquitetura — Da Planilha ao Sistema" },
      {
        name: "description",
        content:
          "Como as abas da planilha de precificação se tornam tabelas relacionais, com integridade referencial, perfis de acesso e integração com ERP.",
      },
      { property: "og:title", content: "Arquitetura — Da Planilha ao Sistema" },
      {
        property: "og:description",
        content: "O caminho técnico de evolução da ferramenta atual para um sistema web.",
      },
    ],
  }),
  component: Arquitetura,
});

const tabelas = [
  {
    nome: "produto",
    origem: "Lista de Produtos",
    registros: produtos.length,
    campos: "codigo, descricao, familia, unidade, ativo",
  },
  {
    nome: "insumo",
    origem: "Insumos",
    registros: insumos.length,
    campos: "codigo, descricao, unidade, custo_unitario, atualizado_em",
  },
  {
    nome: "estrutura_item",
    origem: "Custo MP por Produto",
    registros: bom.length,
    campos: "produto_id, insumo_id, quantidade, unidade, versao",
  },
  {
    nome: "setor",
    origem: "Centro de Custos",
    registros: centroCustos.setores.length,
    campos: "nome, grupo, horas_disponiveis, eficiencia, custo_hora",
  },
  {
    nome: "roteiro",
    origem: "Centro de Custos",
    registros: centroCustos.roteiro.length,
    campos: "produto_id, setor_id, horas_produto, armacao, pintura",
  },
  {
    nome: "parametro_precificacao",
    origem: "Precificação",
    registros: 6,
    campos: "chave, valor, vigencia_inicio, aprovado_por",
  },
  {
    nome: "regra_tributaria",
    origem: "Impostos",
    registros: 3,
    campos: "cenario, familia, icms, pis, cofins, irpj, csll",
  },
  {
    nome: "preco_versao",
    origem: "não existe hoje",
    registros: 0,
    campos: "produto_id, cenario, custo, margem, preco, status, criado_em",
  },
  {
    nome: "auditoria_evento",
    origem: "não existe hoje",
    registros: 0,
    campos: "usuario, modulo, registro, campo, de, para, motivo, data",
  },
];

function Arquitetura() {
  return (
    <>
      <PageHeader
        titulo="Arquitetura da Evolução"
        descricao="Este protótipo roda com os dados reais carregados de forma estática. A tela abaixo mostra o que muda quando a ferramenta passa a ter banco de dados, integrações e controle de acesso."
      />

      <Panel titulo="Fluxo de formação do preço" subtitulo="Como os módulos se conectam">
        <div className="grid gap-3 lg:grid-cols-5">
          {[
            { t: "Insumos", d: "Custo unitário de matéria-prima" },
            { t: "Estruturas", d: "Quanto de cada insumo por produto" },
            { t: "Centro de Custos", d: "Custo de produção por hora de setor" },
            { t: "Despesas e Impostos", d: "Percentuais sobre o preço" },
            { t: "Preço de venda", d: "Resultado auditável e versionado" },
          ].map((s, i) => (
            <div
              key={s.t}
              className={
                i === 4
                  ? "rounded-md border-2 border-green bg-green-soft px-3 py-3 text-center"
                  : "rounded-md border border-border bg-secondary/50 px-3 py-3 text-center"
              }
            >
              <p className="text-[10px] font-bold tracking-widest text-muted-foreground">
                ETAPA {i + 1}
              </p>
              <p className="mt-1 text-sm font-bold tracking-wide text-foreground uppercase">{s.t}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
        <pre className="mt-4 overflow-x-auto rounded-md border border-border bg-muted/60 p-3 text-[11px] leading-relaxed text-foreground">
{`insumo ──< estrutura_item >── produto ──< roteiro >── setor
                                 │                       │
                                 │                  guia_rateio (mão de obra, manutenção)
                                 │
                        motor de precificação ──< preco_versao
                                 │                     │
                    parametro_precificacao       auditoria_evento
                    regra_tributaria
                    despesa_mensal
                    logistica_custo`}
        </pre>
      </Panel>

      <Panel
        className="mt-4"
        titulo="Modelo de dados proposto"
        subtitulo="Cada aba da planilha vira uma tabela com integridade referencial"
        bodyClassName="p-0"
      >
        <table className="w-full">
          <thead>
            <tr>
              <Th>Tabela</Th>
              <Th>Origem na planilha</Th>
              <Th align="right">Registros já extraídos</Th>
              <Th>Campos principais</Th>
            </tr>
          </thead>
          <tbody>
            {tabelas.map((t) => (
              <tr key={t.nome} className="odd:bg-secondary/30">
                <Td className="font-mono text-xs font-semibold">{t.nome}</Td>
                <Td className="text-xs">{t.origem}</Td>
                <Td align="right">{t.registros > 0 ? qtd(t.registros) : "—"}</Td>
                <Td className="font-mono text-[11px] text-muted-foreground">{t.campos}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel titulo="O que este protótipo já demonstra">
          <ul className="space-y-2 text-sm">
            {[
              "Navegação completa entre todos os módulos da ferramenta atual.",
              "Dados reais: produtos, insumos, estruturas, setores, impostos e despesas.",
              "Motor de precificação escrito como regra de sistema, não como fórmula de célula.",
              "Memória de cálculo linha a linha para cada preço gerado.",
              "Edição de estrutura com recálculo imediato do preço.",
              "Validações automáticas de integridade sobre os dados existentes.",
              "Histórico de preços e trilha de auditoria.",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-green" />
                {t}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel titulo="O que ainda não é o sistema definitivo">
          <ul className="space-y-2 text-sm">
            {[
              "Sem banco de dados: os dados são um retrato da planilha de 28.08.2026.",
              "Sem login real, perfis de acesso ou aprovação de alterações.",
              "Sem integração com ERP para produtos, estoque e faturamento.",
              "Regra do Simples aplicada de forma simplificada, pendente de validação fiscal.",
              "Alterações feitas nesta demonstração não são persistidas.",
              "Sem cálculo fiscal oficial por NCM, CFOP e regime do cliente.",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warn" />
                {t}
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel className="mt-4" titulo="Próximos passos sugeridos" bodyClassName="p-0">
        <table className="w-full">
          <thead>
            <tr>
              <Th>Fase</Th>
              <Th>Escopo</Th>
              <Th>Resultado para a diretoria</Th>
            </tr>
          </thead>
          <tbody>
            {[
              [
                "1. Base de dados",
                "Migrar produtos, insumos, estruturas e setores para banco relacional",
                "Fim das cópias de planilha e das referências quebradas",
              ],
              [
                "2. Motor de preço",
                "Parâmetros versionados, aprovação e memória de cálculo oficial",
                "Preço defensável, com autor e data",
              ],
              [
                "3. Acesso e governança",
                "Login, perfis por módulo e trilha de auditoria completa",
                "Controle de quem altera custo e margem",
              ],
              [
                "4. Integrações",
                "ERP, folha de pagamento e contabilidade",
                "Custo atualizado sem digitação manual",
              ],
              [
                "5. Inteligência comercial",
                "Simulação de cenários, alerta de variação de insumo e análise de margem",
                "Decisão de preço com base em dados atualizados",
              ],
            ].map(([f, e, r]) => (
              <tr key={f} className="odd:bg-secondary/30">
                <Td className="font-semibold whitespace-nowrap">{f}</Td>
                <Td className="text-sm">{e}</Td>
                <Td className="text-sm text-muted-foreground">{r}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </>
  );
}

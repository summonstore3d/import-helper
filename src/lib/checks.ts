import { bom, categoriaDoProduto, centroCustos, impostos, insumos, produtos } from "@/data";
import { isNum } from "./format";
import { bomDoProduto } from "./pricing";
import { itensCriticosBom, itensSobrescritos, resumoCentroCustos } from "./correcoes";

export type Severidade = "CRÍTICO" | "ALTO" | "MÉDIO" | "BAIXO";

export type Check = {
  severidade: Severidade;
  problema: string;
  origem: string;
  impacto: string;
  acao: string;
  ocorrencias: number;
  exemplos: string[];
  fonte: "dados reais" | "demonstrativo";
};

const insumosComCusto = new Set(insumos.filter((i) => isNum(i.custoUnitario)).map((i) => i.full));

export function produtosSemBom(): string[] {
  const comBom = new Set(bom.map((l) => l.produto));
  return produtos.filter((p) => !comBom.has(p.full)).map((p) => p.full);
}

export function produtosSemRoteiro(): string[] {
  const comRoteiro = new Set(centroCustos.roteiro.map((r) => r.produto));
  return produtos.filter((p) => !comRoteiro.has(p.full)).map((p) => p.full);
}

export function itensBomSemCusto(): string[] {
  return Array.from(new Set(itensCriticosBom().map((l) => `${l.produto} → ${l.item}`)));
}

export function insumosSemCusto(): string[] {
  return insumos.filter((i) => !insumosComCusto.has(i.full)).map((i) => i.full);
}

export function setoresComReferenciaQuebrada(): string[] {
  return centroCustos.setores
    .filter((s) => !isNum(s.horaReal) || !isNum(s.mesTotal))
    .map((s) => s.nome);
}

export function produtosSemCustoProducao(): string[] {
  return centroCustos.roteiro
    .filter((r) => !isNum(r.custoProducao))
    .map((r) => r.produto);
}

export function categoriasSemRegraTributaria(): string[] {
  const cobertas = new Set(
    impostos.cenarios.flatMap((c) => c.itens.map((i) => i.produto)),
  );
  const categorias = new Set(produtos.map((p) => categoriaDoProduto(p.full)));
  return Array.from(categorias).filter((c) => !cobertas.has(c));
}

export function unidadesDivergentes(): string[] {
  const porItem = new Map<string, Set<string>>();
  for (const l of bom) {
    if (!l.unidade) continue;
    const set = porItem.get(l.item) ?? new Set<string>();
    set.add(l.unidade);
    porItem.set(l.item, set);
  }
  return Array.from(porItem.entries())
    .filter(([, u]) => u.size > 1)
    .map(([item, u]) => `${item} (${Array.from(u).join(" / ")})`);
}

export function checks(): Check[] {
  const semBom = produtosSemBom();
  const semRoteiro = produtosSemRoteiro();
  const semCustoItem = itensBomSemCusto();
  const semCustoInsumo = insumosSemCusto();
  const refQuebrada = setoresComReferenciaQuebrada();
  const semProducao = produtosSemCustoProducao();
  const semRegra = categoriasSemRegraTributaria();
  const unidades = unidadesDivergentes();

  const cc = resumoCentroCustos();
  const sobrescritos = itensSobrescritos();

  const lista: Check[] = [
    {
      severidade: "CRÍTICO",
      problema: "Custo de armação multiplicado duas vezes pelas horas",
      origem: "Centro de Custos (fórmula herdada da planilha)",
      impacto: "Custo de produção subavaliado nos produtos com etapa de armação.",
      acao: "Corrigido: o sistema calcula armação = horas × taxa do setor, uma única vez.",
      ocorrencias: cc.duplaMultiplicacao,
      exemplos: ["Correção já aplicada no motor de cálculo"],
      fonte: "dados reais",
    },
    {
      severidade: "CRÍTICO",
      problema: "Horas de armação lançadas sem custo de armação",
      origem: "Centro de Custos",
      impacto: "Etapa de armação ficava fora do custo do produto.",
      acao: "Corrigido: aplicada a taxa horária do setor de armação, com aviso na tela.",
      ocorrencias: cc.armacaoEstimada,
      exemplos: ["Correção já aplicada, sujeita a validação da engenharia"],
      fonte: "dados reais",
    },
    {
      severidade: "ALTO",
      problema: "Custo total de componente digitado por cima da fórmula",
      origem: "Custo MP por Produto",
      impacto: "O custo não acompanhava a atualização do preço do insumo.",
      acao: "Corrigido: custo total recalculado como quantidade × custo unitário.",
      ocorrencias: sobrescritos.length,
      exemplos: sobrescritos.slice(0, 5).map((i) => `${i.produto} → ${i.item}`),
      fonte: "dados reais",
    },
    {
      severidade: "CRÍTICO",
      problema: "Produto sem estrutura (BOM)",
      origem: "Lista de Produtos × Custo MP por Produto",
      impacto: "Custo de matéria-prima não pode ser apurado; o preço não fecha.",
      acao: "Cadastrar a estrutura do produto no módulo Estruturas / BOM.",
      ocorrencias: semBom.length,
      exemplos: semBom.slice(0, 5),
      fonte: "dados reais",
    },
    {
      severidade: "CRÍTICO",
      problema: "Referência inconsistente no Centro de Custos (#REF!)",
      origem: "Centro de Custos",
      impacto: "$/Hora do setor indisponível; produtos do setor ficam sem custo de produção.",
      acao: "Revisar o vínculo do setor com Guia - CDC e Salários.",
      ocorrencias: refQuebrada.length,
      exemplos: refQuebrada.slice(0, 5),
      fonte: "dados reais",
    },
    {
      severidade: "ALTO",
      problema: "Produto sem custo de produção calculado",
      origem: "Centro de Custos (roteiro por produto)",
      impacto: "Preço calculado ficaria incompleto (apenas matéria-prima).",
      acao: "Corrigir o setor / hora-produto do roteiro.",
      ocorrencias: semProducao.length,
      exemplos: semProducao.slice(0, 5),
      fonte: "dados reais",
    },
    {
      severidade: "ALTO",
      problema: "Produto sem roteiro de produção (centro de custo)",
      origem: "Lista de Produtos × Centro de Custos",
      impacto: "Produto não recebe rateio de mão de obra, manutenção e acabamento.",
      acao: "Vincular o produto a um setor produtivo.",
      ocorrencias: semRoteiro.length,
      exemplos: semRoteiro.slice(0, 5),
      fonte: "dados reais",
    },
    {
      severidade: "ALTO",
      problema: "Categoria de produto sem regra tributária cadastrada",
      origem: "Impostos × Lista de Produtos",
      impacto: "Cenário de venda usa alíquota aproximada, não a oficial.",
      acao: "Cadastrar a categoria nos cenários de venda.",
      ocorrencias: semRegra.length,
      exemplos: semRegra.slice(0, 6),
      fonte: "dados reais",
    },
    {
      severidade: "MÉDIO",
      problema: "Item de estrutura sem custo unitário",
      origem: "Custo MP por Produto",
      impacto: "Componente entra com custo zero na formação do preço.",
      acao: "Atualizar o custo do insumo no módulo Insumos.",
      ocorrencias: semCustoItem.length,
      exemplos: semCustoItem.slice(0, 5),
      fonte: "dados reais",
    },
    {
      severidade: "MÉDIO",
      problema: "Insumo cadastrado sem custo unitário",
      origem: "Insumos",
      impacto: "Estruturas que usarem o insumo ficam subavaliadas.",
      acao: "Informar o custo unitário e a data de referência.",
      ocorrencias: semCustoInsumo.length,
      exemplos: semCustoInsumo.slice(0, 5),
      fonte: "dados reais",
    },
    {
      severidade: "MÉDIO",
      problema: "Unidade incompatível para o mesmo componente",
      origem: "Custo MP por Produto",
      impacto: "Quantidades em unidades diferentes distorcem o custo.",
      acao: "Padronizar a unidade de medida do componente.",
      ocorrencias: unidades.length,
      exemplos: unidades.slice(0, 5),
      fonte: "dados reais",
    },
    {
      severidade: "BAIXO",
      problema: "Parâmetro de precificação sem aprovação registrada",
      origem: "Precificação (margem, comissão, inadimplência)",
      impacto: "Não é possível saber quem aprovou o parâmetro vigente.",
      acao: "Registrar responsável e vigência de cada parâmetro.",
      ocorrencias: 3,
      exemplos: ["Margem de lucro 15%", "Comissão 1%", "Inadimplência 1%"],
      fonte: "demonstrativo",
    },
    {
      severidade: "BAIXO",
      problema: "Custo de insumo sem data de última atualização por item",
      origem: "Insumos",
      impacto: "Não há rastreio de quando cada custo foi revisado.",
      acao: "Passar a registrar data e origem por atualização de custo.",
      ocorrencias: insumos.length,
      exemplos: ["Referência única da planilha: 28.08.2026"],
      fonte: "demonstrativo",
    },
  ];

  return lista.filter((c) => c.ocorrencias > 0);
}

export const ordemSeveridade: Severidade[] = ["CRÍTICO", "ALTO", "MÉDIO", "BAIXO"];

export function resumoProduto(produto: string) {
  const itens = bomDoProduto(produto);
  return {
    temBom: itens.length > 0,
    itens: itens.length,
    temRoteiro: centroCustos.roteiro.some((r) => r.produto === produto),
  };
}

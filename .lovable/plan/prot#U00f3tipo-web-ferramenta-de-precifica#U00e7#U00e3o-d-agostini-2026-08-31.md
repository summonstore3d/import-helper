# Protótipo Web — Ferramenta de Precificação D'AGOSTINI

Protótipo navegável de alta fidelidade que mostra à diretoria como a planilha atual pode virar um sistema web, usando os dados reais extraídos do arquivo `.xlsm`.

## O que foi mapeado na planilha (verificado)

| Aba | Conteúdo real encontrado |
|---|---|
| Lista de Produtos | ~247 produtos reais (AN001…AN073, BL001, CQ001, GAL0xx, TB004, etc.) |
| Insumos | 57 insumos com custo unitário (ex.: 9900430 ROLO FERRO CA60 5,00MM = 5,94; 9902291 CIMENTO CP5 = 0,8595; 9900454 AREIA = 0,07082; 9900460 BRITA ZERO = 0,0836) |
| Custo MP por Produto | ~1.190 linhas de BOM: Produto Acabado → Item, Tipo (Matéria Prima / Produto Acabado), Qtd, Unidade, Custo Unitário, Custo Total + total de MP por produto (AN001 = 92,14) |
| Planilha1 | Amostra de BOM do CQ001 (mesma estrutura) |
| Centro de Custos | Setores reais: Central, Pintura, Armação (Robô/Manual), Molde (Siome, Radial, PH, Chão, Tampa, Anéis, Galerias, Storrer, Vibromatic) com Mão de obra, Manutenção, $ Mês, Eficiência perdida 0,85, Acabamento, Transporte interno, 173,2 h/mês, $/Hora Ideal e $/Hora Real. Segunda tabela: Produto → Setor, $/Hora do Setor, Hora/Produto, Central, Hora/Armação, $/Armação, Pintura, Custo, KG por produto |
| Guia - CDC | Mão de obra por colaborador/operação e manutenção por setor |
| Logística | Fixos (Mão de obra 52.804,70; Seguro 4.003,84; Pedágios 13.520,27; IPVA 23.794,32; Serviços 33.552,17; TOTAL 127.675,30) e Variáveis (Diesel 6,50/L; Consumo 2,69/km; Manutenção 50.467,85; TOTAL 4,61) + Km rodados 23.031,59 e Custo total por km 10,15 |
| Salários | MOD 344.268,54 / 67 colab. / 5.138,34 — MOI 81.009,69 / 13 / 6.231,51 + observações da planilha |
| Impostos | Venda Normal (CONE, GRADIL, GRELHA FARROUPILHA, LAJE EXCENTRICA — ICMS 17%, PIS 0,65%, COFINS 3%, IRPJ 1,08%, CSLL 1,20%, total 22,93%); Venda com Base Reduzida (ANEL, GALERIA, MEIO FIO, CAIXA DE INSPEÇÃO, TUBO — ICMS 12%, total 17,93%); Venda com Material Via Tonial (faixas do Simples: alíquota e valor a deduzir) |
| Despesas | Matriz real de contas × 12 meses (OUTUBRO→SETEMBRO) em R$ e %, com grupos (-) 005 CUSTO MERC.(CMV), (-) 007 DESPESAS VARIÁVEIS, (-) 009 DESPESAS COM PESSOAL, (-) 010 DESPESAS OPERACIONAIS/ADM, subtotais, Faturamento por Mês, Despesas (%) e Média das Despesas = 30,81% |

Fórmula de preço da aba Precificação (verificada): `Preço = (Custo MP + Custo Produção) / (1 − (Despesas% + Margem% + Impostos% + Comissão% + Inadimplência%)) + frete opcional`, com Despesas 30,81%, Margem 15%, Impostos por cenário, Comissão 1%, Inadimplência 1%; frete = (Km / Peças por entrega) × Custo por km × 1,5 quando "Frota = Sim".

## Como os dados entram no protótipo

Um script de extração roda uma única vez no ambiente de desenvolvimento e gera arquivos TypeScript estáticos em `src/data/` (produtos, insumos, BOM, centros de custo, roteiro por produto, logística, salários, impostos, despesas, parâmetros). O app lê esses módulos e mantém tudo em estado local — sem backend, sem banco, sem fórmulas do Excel. O `.xlsm` não entra no repositório.

## Telas

- **Layout**: sidebar escura azul-marinho com marca D'AGOSTINI, topbar "Ferramenta de Precificação" + selo fixo "PROTÓTIPO / DEMONSTRAÇÃO". Paleta azul escuro / verde / branco / cinza, densidade corporativa, tabelas com rolagem horizontal. Desktop primeiro; notebook e tablet funcionais.
- **Dashboard**: contadores reais (produtos, insumos, itens de BOM, centros de custo, contas de despesa, regras tributárias), diagrama do "Fluxo atual da formação do preço" e painel de Alertas marcados como demonstrativos quando não comprovados pelos dados (produtos sem BOM e insumos sem custo são derivados dos dados reais).
- **Produtos**: tabela com busca, filtro por categoria (ANEL, TUBO, GALERIA, CAIXA, MEIO FIO…), Código, Produto, Categoria, Unidade, Status, Custo MP atual, Preço calculado; linha abre a ficha do produto com atalho para BOM e Precificação.
- **Insumos**: os 57 insumos com custo unitário, unidade, data de referência (28.08.2026) e status; busca e ordenação.
- **Estruturas / BOM**: seleção de produto + tabela Item / Tipo / Quantidade / Unidade / Custo Unitário / Custo Total, subtotal de MP; sub-produtos "Produto Acabado" expandíveis (ex.: AN002 consome AN001). Botão "+ ADICIONAR ITEM" abre modal (Componente, Tipo, Quantidade, Unidade) com Cancelar/Adicionar; o item aparece na hora e recalcula o subtotal, marcado como alteração de demonstração.
- **Centro de Custos**: matriz real de setores com seus indicadores e a tabela de roteiro por produto ($/Hora do Setor, Hora/Produto, Armação, Pintura, Custo). Valores `#REF!` da planilha aparecem como "Referência inconsistente" em vez de serem inventados.
- **Logística**: cartões FIXOS e VARIÁVEIS com totais reais, Km rodados, Custo por km e simulador (Distância, Peças por entrega → custo estimado usando a regra da planilha).
- **Despesas**: matriz conta × 12 meses com R$ e %, grupos e subtotais reais, cabeçalho e coluna de conta fixos, rolagem horizontal, rodapé com Faturamento, Despesas (%) e Média 30,81%.
- **Salários**: MOD/MOI com totais, colaboradores e média + observações da planilha exibidas como nota auxiliar (não como regra automática).
- **Impostos**: os três cenários reais, com as faixas do Simples do cenário Via Tonial.
- **Precificação**: selecionar produto + cenário, toggle de frota com Km e peças por entrega, botão CALCULAR PREÇO; resultado em blocos (Matéria-prima, Centro de Custos/Produção, Despesas %, Logística, Custo absoluto, Impostos %, Comissão %, Inadimplência %, Margem %) e PREÇO CALCULADO. Onde o Excel não permite calcular com segurança, o campo mostra "DADO DEMONSTRATIVO" ou "Regra a validar".
- **Memória de cálculo**: painel detalhado — cada insumo com quantidade, custo unitário e total, TOTAL MP, produção, despesas, logística, impostos, margem, preço, em cascata legível.
- **Histórico**: versões de preço por produto (Produto, Data, Custo, Margem, Preço, Cenário, Status) derivadas dos dados reais e sinalizadas como demonstrativas; clique abre a memória daquela versão.
- **Validações**: checks CRÍTICO/ALTO/MÉDIO/BAIXO com Problema, Origem, Impacto, Ação — os derivados dos dados (produto sem BOM, insumo sem custo, `#REF!` em Centro de Custos, unidade divergente) vêm marcados como reais; os demais como demonstrativos.
- **Auditoria**: trilha Data, Usuário, Módulo, Campo, Valor anterior, Novo valor, Motivo, toda rotulada "Demonstração"; alterações feitas na BOM durante a apresentação entram nessa trilha.
- **Arquitetura**: diagrama Produtos → BOM → Insumos, Produção → Centro de Custos, Despesas → Parâmetros, Logística → Impostos → Precificação → Histórico → Auditoria, com o contraste "Hoje: células e fórmulas / Futuro: dados + regras + usuários + histórico", e o modelo de entidades (PRODUCTS, MATERIALS, BOM, BOM_ITEMS, COST_CENTERS, PRODUCTION_COSTS, EXPENSES, LOGISTICS, TAX_RULES, PRICING, PRICE_HISTORY, AUDIT_LOG) com relacionamentos — apenas ilustrativo.

## Detalhes técnicos

- TanStack Start + React + Tailwind; uma rota por módulo em `src/routes/`, `/` = Dashboard.
- `src/data/*.ts` gerado a partir do `.xlsm` (script único de extração, não versionado como dependência de runtime).
- `src/lib/pricing.ts` implementa a regra de preço em código (não fórmulas de planilha); estado de demonstração em memória via contexto React (edições de BOM, cálculos, auditoria).
- Formatação pt-BR (R$, percentuais) e componente reutilizável de rótulo `DEMONSTRATIVO`.
- Sem autenticação, sem banco, sem integrações; head/SEO por rota.

## Fora de escopo

Backend, banco de produção, ERP, cálculo fiscal novo, autenticação real.

# Evolução da ferramenta para sistema de precificação

## Objetivo

Substituir a base atual por **todas as abas da planilha ajustada**, eliminando do percentual de despesas os valores que já estão incorporados ao frete, e transformar os módulos principais em cadastros persistentes e compartilhados pela equipe.

A tela de Precificação será redesenhada como um cockpit minimalista, inspirado na imagem enviada, sem perder as correções fiscais, industriais, validações, memória de cálculo, comparação de despesas, Excel e auditoria já existentes.

## 1. Nova base oficial

- Extrair novamente as 11 abas da planilha ajustada: produtos, insumos, estruturas/BOM, setores, roteiros, guia CDC, logística, salários, impostos, despesas e parâmetros de precificação.
- Tratar essa versão como a nova fonte inicial oficial, incluindo as despesas removidas por já estarem contempladas no frete.
- Reconciliar identificadores e descrições entre produtos, insumos, BOM, setores e roteiros antes da carga, preservando as correções do sistema para armação, Simples efetivo, custos ausentes, despesa média/ponderada, km/L e markup divisor.
- Validar totais e amostras críticas contra os valores calculados da nova planilha, com atenção ao produto TB004 exibido na referência e aos itens previamente auditados.

## 2. Dados compartilhados e seguros

- Ativar o Lovable Cloud para banco de dados, autenticação e operações protegidas.
- Criar acesso por usuário para que alterações compartilhadas tenham autoria real; remover o usuário fictício `diretoria.demo` dos novos registros.
- Migrar os dados iniciais da planilha para tabelas relacionadas por identificadores estáveis, evitando vínculos frágeis por descrição.
- Aplicar permissões por usuário autenticado, regras de acesso no banco e trilha de auditoria para inclusões, edições, exclusões e importações.
- Manter cálculos derivados como resultado das fontes cadastradas, sem salvar totais redundantes que possam ficar desatualizados.

## 3. Cadastros e edição completa

### Insumos

- Manter busca, colunas configuráveis e importação/exportação Excel.
- Permitir adicionar, editar e excluir insumos permanentemente.
- Validar código único, descrição, unidade e custo; impedir exclusão quando houver uso em uma estrutura sem antes resolver a dependência.
- Recalcular todos os produtos afetados após uma alteração de custo.

### Estruturas / BOM

- Transformar a composição por produto em cadastro completo: adicionar, editar e remover componentes existentes ou novos.
- Usar insumos e produtos intermediários cadastrados, com quantidade, unidade e tipo.
- Calcular sempre `quantidade × custo unitário`, mostrar impacto no subtotal e bloquear preços diante de custos ou quantidades inválidos.
- Confirmar exclusões e registrar cada alteração na auditoria.

### Centro de Custos e Guia CDC

- Tornar editáveis as quatro áreas: custo por setor, roteiro por produto, rateio de mão de obra e rateio de manutenção.
- Permitir adicionar, editar e excluir setores, linhas de roteiro, funções/alocações e rateios.
- Recalcular automaticamente custo mensal, horas ideais/reais, custo por hora, custo de armação e custo de produção.
- Validar soma dos percentuais de manutenção, referências entre setor e roteiro e dependências antes de excluir.
- Preservar a regra corrigida de armação: `horas × taxa`, uma única vez.

## 4. Demonstrativo mensal de despesas

- Normalizar o demonstrativo por conta e competência mensal para permitir edição célula a célula.
- Adicionar a ação **Novo mês**, pedindo mês/ano e criando uma nova coluna com a estrutura atual e valores vazios.
- Permitir preenchimento manual, salvar rascunho/fechamento e editar contas do mês.
- Recalcular faturamento, totais, percentuais, média simples e taxa ponderada após cada alteração.
- Manter importação/exportação Excel e CSV, agora atualizando os mesmos registros persistentes.
- Evitar novamente a dupla contagem: despesas já incluídas no frete permanecerão fora da base aplicada ao preço conforme a planilha ajustada.

## 5. Precificação minimalista

- Reorganizar a tela com uma lista pesquisável de produtos à esquerda e, no centro, o produto selecionado, os componentes essenciais do preço e o resultado final em destaque.
- Usar a imagem enviada como referência estrutural: Matéria-prima, Produção, Frota, Peças por entrega, Quilometragem, Despesas, Margem, Impostos, Comissão, Inadimplência, Tipo de venda e Preço final.
- Melhorar a referência com hierarquia mais limpa, campos consistentes, seleção instantânea e boa adaptação para notebook, tablet e celular.
- Manter controles menos frequentes em uma área recolhível de parâmetros avançados.
- Manter alertas e bloqueios próximos ao campo afetado; deixar memória de cálculo, composição da matéria-prima e comparação média/ponderada em detalhes expansíveis.
- Preservar ações de salvar simulação e exportar Excel, usando a versão persistente dos dados.

## 6. Auditoria, histórico e integridade

- Persistir histórico de preços como fotografia dos parâmetros e resultados usados no momento do salvamento.
- Registrar usuário, data, módulo, registro, campo, valor anterior, valor novo e motivo em toda mudança relevante.
- Atualizar Validações para consultar a base compartilhada e detectar insumos sem custo, BOM incompleta, roteiro inválido, rateios inconsistentes e percentuais fora dos limites.
- Manter o relatório técnico coerente com a nova arquitetura e com a nova base de despesas.

## 7. Verificação

- Criar testes para as regras que afetam preço: armação sem duplicidade, Simples efetivo, custo de BOM, média/ponderada, exclusão das despesas já cobertas pelo frete, frete e markup divisor.
- Testar permissões, CRUD completo, bloqueios de exclusão, inclusão de novo mês, importações em lote, auditoria e histórico.
- Conferir visualmente os principais fluxos em desktop e mobile, incluindo a nova Precificação.
- Validar exportações Excel, ausência de erros de cálculo e consistência do preço entre tela, histórico e arquivo exportado.

## Detalhes técnicos

- Estrutura relacional principal: produtos, insumos, itens de BOM, setores, roteiros, funções e alocações de mão de obra, rateios de manutenção, contas de despesa, competências mensais, lançamentos, parâmetros, simulações e auditoria.
- A carga inicial será feita por migração versionada com os dados literais extraídos da planilha; não haverá semeadura automática ao abrir a página.
- Leituras e gravações protegidas usarão funções do servidor; as regras de cálculo receberão dados carregados, em vez de importar JSON estático diretamente.
- Operações Excel em lote serão transacionais: o arquivo inteiro será validado antes de qualquer alteração e retornará um resumo de inclusões, atualizações e problemas.
- O estado React atual deixará de ser fonte de verdade e passará a refletir os dados persistidos e o estado temporário de formulários.
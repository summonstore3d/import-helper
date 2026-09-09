# Pricing Evolution System

Quero criar um PROTÓTIPO WEB NAVEGÁVEL DE ALTA FIDELIDADE da ferramenta de precificação atualmente utilizada pela empresa.

O arquivo Excel anexado é a FONTE PRINCIPAL deste protótipo.

IMPORTANTE:

NÃO quero ainda o sistema definitivo.

NÃO quero uma simples conversão do Excel para HTML.

NÃO quero copiar células.

NÃO quero reproduzir fórmulas do Excel como arquitetura.

Quero demonstrar para a DIRETORIA como a ferramenta atual poderia evoluir de uma planilha para um SISTEMA WEB PROFISSIONAL.

Porém, ao contrário de um mockup genérico, quero utilizar OS DADOS, NOMES, PRODUTOS, INSUMOS, ESTRUTURAS, CATEGORIAS E CONCEITOS REAIS existentes na planilha.

==================================================

1. FONTE DE DADOS

==================================================

Analise completamente o arquivo Excel anexado antes de construir o protótipo.

A planilha possui atualmente as seguintes abas:

- Menu

- Precificação

- Centro de Custos

- Guia - CDC

- Logística

- Planilha1

- Custo MP por Produto

- Insumos

- Lista de Produtos

- Salários

- Impostos

- Despesas

Esses nomes devem ser considerados como referência real do sistema.

Não renomeie conceitos sem necessidade.

Não substitua dados reais por dados fictícios quando houver dados disponíveis na planilha.

==================================================

2. REGRA MAIS IMPORTANTE

==================================================

O protótipo deve utilizar:

DADOS REAIS DA PLANILHA

+

INTERFACE NOVA

+

FLUXO DE SISTEMA

Exemplo:

Se a planilha possui:

AN001 - ANEL DN 600 X 750 X 70 PBJE EA2

utilize exatamente esse produto na demonstração.

Se possui:

TB004 - TUBO DN 300 X 2000 X 50 PBJE EA2

utilize exatamente esse produto.

Se possui:

9900430 - ROLO FERRO CA60 5,00MM.26611

utilize esse insumo.

Se possui:

9900456 - CIMENTO CP IV-32 26606 REF1233

utilize esse insumo.

Se possui:

9900458 - BRITA 01 - 26605

utilize esse insumo.

Se possui:

9900454 - AREIA RG.12463/15-10/302.26603

utilize esse insumo.

NÃO invente nomes genéricos como:

"Produto A"

"Produto B"

"Material X"

quando existir informação equivalente no Excel.

==================================================

3. OBJETIVO DA DEMONSTRAÇÃO

==================================================

A diretoria deve conseguir olhar o protótipo e entender:

"Hoje fazemos isso em uma planilha."

"Podemos transformar isso em um sistema."

"Os dados continuam existindo."

"Mas agora ficam organizados."

"Os cálculos ficam centralizados."

"Os usuários não precisam manipular células."

"E conseguimos rastrear como o preço foi formado."

==================================================

4. CONCEITO VISUAL

==================================================

O sistema deve ser moderno, mas claramente inspirado na ferramenta atual.

A planilha possui uma identidade visual baseada principalmente em:

- azul escuro;

- verde;

- branco;

- cinza;

- tabelas;

- títulos grandes;

- seções destacadas;

- totais;

- agrupamentos.

Preserve essa identidade.

Porém, transforme-a em uma experiência web moderna.

Não faça parecer um template SaaS genérico.

Quero algo com aparência de:

"Sistema corporativo interno de gestão de custos e precificação."

==================================================

5. MENU PRINCIPAL

==================================================

Criar sidebar:

D'AGOSTINI

Dashboard

Produtos

Insumos

Estruturas / BOM

Centro de Custos

Logística

Despesas

Salários

Impostos

Precificação

Histórico

Validações

Auditoria

No topo:

"Ferramenta de Precificação"

Indicar claramente:

"PROTÓTIPO / DEMONSTRAÇÃO"

==================================================

6. DASHBOARD

==================================================

Usar dados reais da planilha para preencher os indicadores.

Mostrar:

Produtos cadastrados

Insumos cadastrados

Estruturas/BOM

Centros de custo

Despesas

Regras tributárias

Criar seção:

"Fluxo atual da formação do preço"

Produto

↓

Estrutura/BOM

↓

Matéria-prima

↓

Centro de custos

↓

Despesas

↓

Logística

↓

Impostos

↓

Margem

↓

Preço

Criar também:

"Alertas"

Exemplos baseados nos problemas encontrados na estrutura:

Produto sem estrutura

Insumo sem custo

Referência inconsistente

Parâmetro pendente

Produto sem roteiro

IMPORTANTE:

Esses alertas podem ser demonstrativos.

Não afirmar que são problemas reais se não tiverem sido comprovados pelos dados.

==================================================

7. PRODUTOS

==================================================

Criar tabela utilizando os produtos REAIS da aba "Lista de Produtos".

Colunas:

Código

Produto

Categoria

Unidade

Status

Custo atual

Preço atual

Utilizar produtos reais como:

AN001 - ANEL DN 600 X 750 X 70 PBJE EA2

AN002 - ANEL DN 600 X 750 X 70 PBJE EA2 - IMPERMEABILIZADO

AN003 - ANEL DN 600 X 500 X 70 JE EA2 COM FUNDO

TB004 - TUBO DN 300 X 2000 X 50 PBJE EA2

e outros encontrados no arquivo.

Não inventar códigos.

==================================================

8. INSUMOS

==================================================

Usar os dados reais da aba "Insumos".

Exibir:

Descrição

Custo unitário

Unidade

Data

Status

Exemplos reais:

9900428 - ROLO FERRO CA60 4,20MM.26611

9900430 - ROLO FERRO CA60 5,00MM.26611

9900432 - ROLO FERRO CA60 6,00MM.26611

9900436 - ROLO FERRO CA60 8,00MM.26611

9900454 - AREIA RG.12463/15-10/302.26603

9900456 - CIMENTO CP IV-32 26606 REF1233

9900458 - BRITA 01 - 26605

9900460 - BRITA ZERO - 26604

Os valores devem vir da planilha.

==================================================

9. ESTRUTURA / BOM

==================================================

Esta é uma das telas mais importantes.

Utilizar a estrutura real encontrada na aba:

"Custo MP por Produto"

e/ou

"Planilha1".

Não transformar a estrutura em células editáveis.

Criar uma estrutura real:

PRODUTO

↓

ITENS DA BOM

Tabela:

Item

Tipo

Quantidade

Unidade

Custo Unitário

Custo Total

Exemplo utilizando os dados reais:

Produto:

AN001 - ANEL DN 600 X 750 X 70 PBJE EA2

Itens:

9900430 - ROLO FERRO CA60 5,00MM.26611

0,74 KG

9900428 - ROLO FERRO CA60 4,20MM.26611

2,26 KG

9900611 - ESPACADOR DPV 15

4 UN

9900454 - AREIA RG.12463/15-10/302.26603

299 KG

9902291 - CIMENTO CP5.46.02.26606

54 KG

9900460 - BRITA ZERO - 26604

80 KG

Utilizar os valores reais encontrados no Excel.

==================================================

10. INTERAÇÃO DA BOM

==================================================

Demonstrar a diferença entre Excel e sistema.

No Excel:

"preciso inserir uma linha."

No sistema:

"+ ADICIONAR ITEM"

Abrir modal:

Componente

Tipo

Quantidade

Unidade

Botões:

Cancelar

Adicionar

Depois mostrar o novo item imediatamente na tabela.

A alteração pode ser apenas local para fins de demonstração.

==================================================

11. CENTRO DE CUSTOS

==================================================

Usar a aba:

"Centro de Custos"

e a aba:

"Guia - CDC"

como referência.

Mostrar os centros/áreas existentes na planilha.

Exemplos encontrados:

Central

Pintura

Armação

Molde

Siome

Radial

PH

Chão

Tampa

Anéis

Mostrar:

Custo

Mão de obra

Manutenção

Eficiência

Acabamento

Transporte interno

Horas disponíveis

A tela deve parecer um módulo de gestão de custos.

==================================================

12. SALÁRIOS

==================================================

Usar os dados reais da aba "Salários".

Mostrar:

Categoria

Salário total

Colaboradores

Salário médio

Categorias existentes:

MOD

MOI

Também preservar as observações existentes na planilha como informação auxiliar.

Não transformar observações em regras automáticas sem validação.

==================================================

13. LOGÍSTICA

==================================================

Usar os dados reais da aba "Logística".

Separar visualmente:

FIXOS

Mão de obra

Seguro

Pedágios

IPVA

Serviços

VARIÁVEIS

Valor Diesel

Consumo Diesel/Km

Manutenção

Mostrar:

TOTAL FIXOS

TOTAL VARIÁVEIS

E criar um pequeno simulador:

Distância

Custo/km

Custo estimado

==================================================

14. DESPESAS

==================================================

Esta tela deve ser MUITO próxima conceitualmente da planilha.

Usar os dados reais da aba "Despesas".

Criar matriz:

DESPESA / CONTA

OUTUBRO

R$ | %

NOVEMBRO

R$ | %

DEZEMBRO

R$ | %

JANEIRO

R$ | %

FEVEREIRO

R$ | %

MARÇO

R$ | %

ABRIL

R$ | %

MAIO

R$ | %

JUNHO

R$ | %

JULHO

R$ | %

AGOSTO

R$ | %

SETEMBRO

R$ | %

Preservar as categorias reais.

Exemplos:

(-) 005 - CUSTO MERC.(CMV)

MATERIA PRIMA

MATERIAL PARA USO NA FABRICAÇÃO

TOTAL MÃO DE OBRA MOD

SALÁRIO MOD (MÃO DE OBRA DIRETA)

SALÁRIO MOD TERCEIROS (NOVA ERA)

AJUDA DE CUSTO/CARTÃO BENEFICIO

ALMOÇOS

ALMOÇO - SÁBADO

E demais contas existentes.

Manter:

R$

%

Totais

Subtotais

Categorias

A tabela deve ter rolagem horizontal.

==================================================

15. IMPOSTOS

==================================================

Utilizar a aba real "Impostos".

Mostrar cenários existentes.

Exemplo:

VENDA NORMAL

Produtos

ICMS

PIS

COFINS

IRPJ

CSLL

TOTAL DE TRIBUTOS

Usar os produtos/categorias reais encontrados na planilha.

Também apresentar:

VENDA COM BASE REDUZIDA

e demais cenários existentes no arquivo.

==================================================

16. PRECIFICAÇÃO

==================================================

Esta será a principal tela da apresentação.

Usar produtos reais.

Exemplo:

Produto:

TB004 - TUBO DN 300 X 2000 X 50 PBJE EA2

Criar:

[Selecionar produto]

[Selecionar cenário]

[CALCULAR PREÇO]

Depois mostrar:

MATÉRIA-PRIMA

R$ XX,XX

CENTRO DE CUSTOS / PRODUÇÃO

R$ XX,XX

DESPESAS

XX,XX%

LOGÍSTICA

R$ XX,XX

CUSTO ABSOLUTO

R$ XX,XX

IMPOSTOS

XX,XX%

COMISSÃO

XX,XX%

INADIMPLÊNCIA

XX,XX%

MARGEM

XX,XX%

--------------------------------

PREÇO CALCULADO

R$ X.XXX,XX

Usar valores reais quando puderem ser calculados com segurança a partir da planilha.

Quando não puder calcular corretamente:

mostrar "DADO DEMONSTRATIVO"

e NÃO inventar que o valor é oficial.

==================================================

17. MEMÓRIA DE CÁLCULO

==================================================

Ao clicar:

"Ver memória de cálculo"

abrir uma visão detalhada.

Exemplo:

PRODUTO

TB004...

MATÉRIA-PRIMA

Cimento

Quantidade

Custo unitário

Total

Areia

Quantidade

Custo unitário

Total

Brita

Quantidade

Custo unitário

Total

Aço

Quantidade

Custo unitário

Total

TOTAL MP

↓

PRODUÇÃO

↓

DESPESAS

↓

LOGÍSTICA

↓

IMPOSTOS

↓

MARGEM

↓

PREÇO

A diretoria precisa conseguir responder:

"De onde veio esse preço?"

sem abrir uma fórmula.

==================================================

18. HISTÓRICO

==================================================

Criar:

HISTÓRICO DE PREÇOS

Colunas:

Produto

Data

Custo

Margem

Preço

Cenário

Status

Ao clicar em uma versão:

abrir a memória de cálculo daquela versão.

Para o protótipo, pode utilizar versões demonstrativas derivadas dos dados reais.

==================================================

19. VALIDAÇÕES

==================================================

Criar tela:

CHECKS

Categorias:

CRÍTICO

ALTO

MÉDIO

BAIXO

Exemplos:

Produto sem BOM

Insumo sem custo

Unidade incompatível

Produto sem centro de custo

Parâmetro ausente

Regra tributária ausente

Mostrar:

Problema

Origem

Impacto

Ação

==================================================

20. AUDITORIA

==================================================

Criar tela:

AUDITORIA

Mostrar exemplos baseados na estrutura real:

Data

Usuário

Módulo

Campo

Valor anterior

Novo valor

Motivo

Exemplo demonstrativo:

Insumos

Custo unitário

R$ X

→

R$ Y

Identificar claramente:

"Demonstração"

==================================================

21. ARQUITETURA DO SISTEMA

==================================================

Criar uma tela chamada:

"Arquitetura"

Mostrar visualmente:

┌──────────────┐

│  PRODUTOS    │

└──────┬───────┘

       ↓

┌──────────────┐

│     BOM      │

└──────┬───────┘

       ↓

┌──────────────┐

│   INSUMOS    │

└──────────────┘

e:

PRODUÇÃO

↓

CENTRO DE CUSTOS

DESPESAS

↓

PARÂMETROS

LOGÍSTICA

↓

IMPOSTOS

↓

PRECIFICAÇÃO

↓

HISTÓRICO

↓

AUDITORIA

Explicar visualmente:

"Hoje: células e fórmulas."

"Futuro: dados + regras + usuários + histórico."

==================================================

22. DATABASE — APENAS DEMONSTRAÇÃO

==================================================

Não criar backend definitivo.

Mas demonstrar como os dados poderiam ser organizados.

Mostrar entidades:

PRODUCTS

MATERIALS

BOM

BOM_ITEMS

COST_CENTERS

PRODUCTION_COSTS

EXPENSES

LOGISTICS

TAX_RULES

PRICING

PRICE_HISTORY

AUDIT_LOG

Mostrar os relacionamentos visualmente.

==================================================

23. IMPORTANTE — NÃO REPRODUZIR OS ERROS DO EXCEL

==================================================

A planilha possui fórmulas e referências que fazem parte da implementação atual.

NÃO copiar automaticamente essas fórmulas para o sistema.

Exemplo:

Se a planilha utiliza:

VLOOKUP

IFERROR

SUM

referências entre abas

Tabelas Dinâmicas

isso NÃO significa que devemos reproduzir essas fórmulas.

No futuro:

dados ficam no banco;

regras ficam no backend;

interface apenas apresenta os resultados.

==================================================

24. NÃO INVENTAR REGRAS

==================================================

Quando a planilha não permitir determinar claramente uma regra:

não inventar.

Mostrar:

"Regra a validar"

ou

"Demonstração"

O objetivo é mostrar a arquitetura futura, não afirmar que todas as regras atuais estão corretas.

==================================================

25. FLUXO PRINCIPAL DA DEMONSTRAÇÃO

==================================================

O protótipo precisa permitir fazer esta apresentação:

1.

Abrir Dashboard.

2.

Entrar em Produtos.

3.

Selecionar:

TB004 - TUBO DN 300 X 2000 X 50 PBJE EA2

4.

Abrir Estrutura/BOM.

5.

Mostrar os componentes reais.

6.

Adicionar um novo item.

7.

Mostrar que não é necessário inserir uma linha.

8.

Ir para Precificação.

9.

Selecionar o mesmo produto.

10.

Calcular.

11.

Mostrar a memória de cálculo.

12.

Abrir Validações.

13.

Mostrar possíveis inconsistências.

14.

Abrir Histórico.

15.

Mostrar rastreabilidade.

16.

Abrir Arquitetura.

17.

Mostrar como isso poderia evoluir para um sistema definitivo.

==================================================

26. EXPERIÊNCIA DE APRESENTAÇÃO

==================================================

Quero uma experiência extremamente fluida.

Nada deve parecer inacabado.

Botões precisam funcionar.

Filtros precisam funcionar.

Modais precisam funcionar.

Menus precisam funcionar.

Tabelas precisam funcionar.

Usar dados reais da planilha.

Não deixar telas vazias.

==================================================

27. DADOS DEMONSTRATIVOS

==================================================

Quando for necessário criar informação que não existe na planilha:

marcar claramente:

DEMONSTRATIVO

Não misturar informação fictícia com informação real sem identificação.

==================================================

28. ESCOPO TÉCNICO

==================================================

Neste momento:

Frontend funcional.

Estado local.

Dados derivados do Excel.

Sem autenticação real.

Sem banco de produção.

Sem integração ERP.

Sem API externa.

Sem deploy de produção.

Sem sistema fiscal real.

Sem cálculo tributário novo que não esteja suportado pela planilha.

O objetivo é:

PROTÓTIPO PARA DIRETORIA.

==================================================

29. RESPONSIVIDADE

==================================================

Prioridade:

Desktop.

Mas deve funcionar também em:

Notebook

Tablet

Tabelas largas devem possuir rolagem horizontal.

==================================================

30. CRITÉRIO DE SUCESSO

==================================================

Quando a diretoria abrir o protótipo, deve parecer:

"Essa é a nossa ferramenta de precificação, só que transformada em sistema."

E não:

"Esse é um dashboard genérico criado por uma IA."

Preservar:

- nomes reais;

- produtos reais;

- insumos reais;

- categorias reais;

- estrutura real;

- nomenclatura real;

- conceitos reais;

- organização conceitual da planilha.

Modernizar:

- navegação;

- edição;

- pesquisa;

- memória de cálculo;

- histórico;

- validações;

- rastreabilidade.

==================================================

31. REGRA FINAL

==================================================

Antes de construir:

ANALISE O EXCEL COMPLETO.

Mapeie:

ABA

↓

DADOS

↓

FÓRMULAS

↓

DEPENDÊNCIAS

↓

REGRAS

↓

SAÍDAS

Depois construa o protótipo.

NÃO pule diretamente para uma interface genérica.

O Excel anexado é a principal fonte de conteúdo e referência.

Quero que o protótipo demonstre uma possível evolução da ferramenta atual para um sistema web profissional.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9dab89df-8e3c-4802-a588-9753145f754a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

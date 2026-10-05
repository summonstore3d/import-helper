# Precificação orientada ao vendedor

## Objetivo
Transformar a tela de Precificação em um painel comercial inspirado na referência enviada, deixando o preço e seus componentes visíveis de imediato e mantendo detalhes técnicos fora do fluxo principal.

## Interface principal
- Manter a lista pesquisável de produtos na lateral.
- Destacar o produto selecionado no topo do painel.
- Exibir em uma grade clara: Matéria-prima, Custo de produção, Despesas, Margem de lucro, Impostos, Comissão, Inadimplência e Preço final.
- Manter cenário/tipo de venda e opções de entrega no mesmo fluxo, sem exigir abertura de “Parâmetros avançados”.
- Permitir editar apenas os campos comerciais e logísticos; custos calculados aparecem como leitura.
- Dar maior destaque visual ao Preço final e manter ações de salvar e exportar no cabeçalho.

## Perfis e memória de cálculo
- Manter “Memória de cálculo” e “Composição da matéria-prima” recolhidas em uma área de detalhes técnicos.
- Nesta etapa, preservar o acesso atual para não introduzir permissões incompletas.
- Estruturar essa área para ser ocultada de vendedores quando os perfis vendedor, gerente e administrador forem definidos.

## Validação
- Confirmar os oito componentes e o preço final na tela.
- Testar seleção de produto, cenários, parâmetros editáveis, frota, salvar e exportar.
- Verificar a apresentação em desktop e celular, sem sobreposição ou texto cortado.

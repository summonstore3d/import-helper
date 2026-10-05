# Redesign clean — Centro de Custos

Mesma lógica, mesmas fórmulas, mesmos dados. Apenas apresentação, tudo em `src/routes/centro-de-custos.tsx` (nenhuma mudança em cálculos, state ou outras rotas).

## Problemas atuais (confirmados por screenshot)
- Três blocos de aviso empilhados (modo consulta + banner longo de correções) roubam a atenção.
- Botões de aba em forma de pílula pesam visualmente.
- Tabela de 10 colunas corta horizontalmente (a coluna $/h real fica fora da tela).

## Mudanças

1. **Banner de correções → recolhível** (`<details>`): fechado mostra só o título + impacto médio por peça; aberto mostra o texto completo. Some o peso amarelo permanente.
2. **Abas → underline tabs**: botões de pílula viram abas com sublinhado (border-b), estilo padrão de sistemas; a ativa fica com a cor primária.
3. **Tabela compacta sem corte horizontal**: paddings menores (px-2.5/py-1.5), cabeçalhos abreviados ("Transp. int.", "H. disp."), números em `text-xs tabular-nums`; colunas $/h ideal e $/h real ganham fundo sutil e a $/h real fica em negrito como resultado final da linha.
4. **Zebra mais suave**: `odd:bg-secondary/30` → `odd:bg-secondary/20` e linha com referência quebrada mantém os avisos em vermelho como hoje.

## O que NÃO muda
- Colunas, dados, fórmulas, edição quando autenticado, EditLockBanner, KPIs e as abas Roteiro/Rateio com todo o conteúdo.

## Validação
- Playwright em /centro-de-custos: captura em 1261px confirmando que a tabela não corta mais a coluna $/h real.
- `bunx tsgo --noEmit` sem erros.

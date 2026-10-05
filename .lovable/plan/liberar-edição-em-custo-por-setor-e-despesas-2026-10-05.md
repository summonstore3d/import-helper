# Liberar edição em Custo por setor e Despesas

## O que está acontecendo

- A edição dessas telas só é liberada para quem entrou no sistema com uma conta. Hoje o sistema mostra você como "Visitante".
- Não existe nenhuma conta cadastrada ainda. Por isso os campos aparecem só como leitura e o botão "Novo mês" fica desativado.
- As telas não avisam isso: o campo simplesmente não vira editável, sem explicar o motivo. Se uma gravação falhar, também não aparece nenhum aviso.

## O que será feito

1. **Aviso claro nas telas editáveis** (Despesas, Centro de Custos, Insumos, Estruturas/BOM): quando você não tiver entrado, aparece uma faixa no topo: "Entre na sua conta para editar estes dados", com botão que leva direto para a tela de acesso e volta para a página depois do login.
2. **Acesso visível no topo do sistema**: botão "Entrar" sempre à vista quando você for visitante; depois do login, mostra seu e-mail e "Sair".
3. **Criar a primeira conta sem travar**: a tela de acesso ganha o fluxo de cadastro com e-mail e senha bem visível, com mensagem explicando que é preciso confirmar o e-mail recebido antes de entrar. Entrar com Google continua disponível.
4. **Novo mês com campo próprio**: trocar a janela de pergunta do navegador por um pequeno formulário (mês e ano), que avisa se a competência já existe.
5. **Aviso de gravação**: depois de cada alteração, mostrar "Salvo" ou uma mensagem de erro clara se não for possível gravar, em vez de falhar em silêncio.
6. **Conferência**: criar uma conta de teste, entrar, adicionar um mês em Despesas, alterar um valor em Custo por setor, recarregar a página e confirmar que os valores continuam lá e aparecem na Auditoria.

## Detalhes técnicos

- Causa confirmada: `autenticado = userId !== null` em `src/state/prototype.tsx`; `auth.users` tem 0 registros; as rotas usam `disabled={!autenticado}`. As regras de acesso do banco exigem usuário autenticado para gravar em `system_state`, então a exigência de login é mantida (sem liberar gravação anônima).
- `persistir` passará a verificar o `error` do upsert e expor um estado de salvamento (`salvando` / `salvo` / `erro`) no contexto, consumido por um indicador compartilhado.
- Os registros atuais de `costCenters` e `expenses` no banco estão vazios e em outro formato; o app hoje cai nos dados da planilha embutida. Na primeira edição autenticada, o payload completo (setores, roteiro, guia, meses, linhas, rodapé) é gravado no formato que o app lê, então nenhum dado é perdido.
- Componente `EditLockBanner` reutilizável em `src/components/`, com link para `/acesso?redirect=<rota atual>`.

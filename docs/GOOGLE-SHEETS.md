# Integração automática com Google Sheets

O MySQL continua sendo a fonte oficial dos agendamentos. O Google Sheets recebe uma cópia operacional para consulta; a indisponibilidade do Google nunca deve impedir uma reserva.

## Como funciona

1. O backend grava a alteração do agendamento e um evento em `integracao_sheets_outbox` na mesma transação MySQL.
2. Um worker independente consulta a fila e envia os dados para a aba `Agendamentos`.
3. A coluna A contém o ID do agendamento. Ela é usada para atualizar a linha existente em vez de criar duplicatas.
4. Se o Google estiver indisponível, o evento permanece pendente e recebe nova tentativa com intervalo crescente (backoff).

A integração sincroniza nome do cliente, serviço, profissional, data, horários, valor e status. Não envia telefone, e-mail, observação ou outros dados pessoais desnecessários.

## Preparação no Google Cloud

1. Crie um projeto no Google Cloud Console.
2. Ative a **Google Sheets API**.
3. Crie uma conta de serviço e gere uma chave JSON.
4. Crie uma planilha Google Sheets e adicione uma aba chamada exatamente `Agendamentos`.
5. Compartilhe a planilha com o e-mail da conta de serviço, com permissão de **Editor**.
6. Copie o ID da planilha: é o trecho entre `/d/` e `/edit` no endereço.

A conta de serviço não precisa de acesso geral ao Drive; compartilhe somente a planilha necessária.

## Variáveis de ambiente do backend

Configure no servidor (não no GitHub nem no navegador):

- `GOOGLE_SHEETS_SPREADSHEET_ID`: ID da planilha.
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`: campo `client_email` do JSON da conta de serviço.
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`: campo `private_key` do JSON. Em plataformas que não preservam quebras de linha, use `\n` no lugar das quebras.
- `GOOGLE_SHEETS_SYNC_INTERVAL_MS`: intervalo em milissegundos (padrão 30000).

A integração só é ativada quando as três primeiras variáveis estão configuradas. Nunca versione a chave JSON, a chave privada ou um arquivo `.env`.

## Banco de dados

Execute `database/mysql/06_google_sheets_outbox.sql` depois das migrações anteriores, inclusive `05_notificacoes_push.sql`.

## Verificação pelo painel

Com a conta administrativa autenticada, consulte `GET /api/admin/integracoes/google-sheets/status`. A resposta informa se a integração está habilitada e quantos eventos permanecem pendentes ou com erro.

## Operação e limitações

- A primeira linha da aba é preenchida automaticamente com os cabeçalhos.
- O worker processa até 20 eventos por ciclo e foi projetado para uma única instância do backend; antes de escalar horizontalmente, será necessário adicionar um mecanismo de bloqueio distribuído para impedir dois workers de incluírem a mesma linha simultaneamente.
- A planilha é uma projeção de consulta; não edite seus dados esperando que sejam gravados de volta no MySQL.
- Para evitar duplicidade, o ID do agendamento é a chave de correspondência.
- Se a planilha ou a aba for removida/renomeada, a fila continuará tentando até a configuração ser corrigida.
- Antes de produção, faça um teste real de criação, cancelamento e remarcação com uma planilha de teste.

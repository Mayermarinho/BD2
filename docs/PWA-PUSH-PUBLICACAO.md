# Web Push e publicação iOS/Android

O frontend é uma única PWA responsiva. Não há necessidade de manter dois aplicativos nativos:
- iPhone/iPad: instalar pelo Safari em **Compartilhar → Adicionar à Tela de Início**. O Web Push no iOS/iPadOS requer iOS/iPadOS 16.4 ou posterior e a PWA instalada na Tela de Início; a permissão deve ser solicitada após uma ação explícita do usuário.
- Android: instalar pelo navegador compatível e autorizar notificações.

## Banco MySQL

A estrutura principal real do sistema está em `database/mysql/01_schema_original.sql` e migrações subsequentes. A tabela de inscrições push está em `05_notificacoes_push.sql`. Execute-a no mesmo banco MySQL persistente da aplicação. Não use banco em memória para produção.

## Configuração necessária para ativar envios

O envio ainda depende da integração do servidor com Web Push (VAPID), endpoints autenticados de inscrição/remoção e armazenamento das inscrições. Configure as chaves VAPID somente como variáveis secretas no provedor de hospedagem:
- `VAPID_PUBLIC_KEY`: chave pública, pode ser exposta ao frontend.
- `VAPID_PRIVATE_KEY`: chave privada, somente no backend.
- `VAPID_SUBJECT`: contato no formato `mailto:...`.

Nunca grave chaves privadas, senhas ou URLs de banco com credenciais no GitHub. A notificação deve ser disparada somente depois do commit bem-sucedido do agendamento. Inscrições expiradas (HTTP 404/410) devem ser removidas.

## Demonstração versus produção

`MODO_DEMO=true` usa dados em memória para demonstração e testes; os dados não são persistentes. Para agendamentos reais, use MySQL gerenciado/persistente e configure `DATABASE_URL`, `JWT_SECRET` e `CORS_ORIGIN`. Não apresente a demonstração como se estivesse conectada ao banco real.

## Hospedagem

- Frontend: Vercel com diretório raiz `frontend`.
- API: serviço Node persistente (por exemplo Railway ou Render), diretório raiz `backend`.
- Banco: MySQL gerenciado persistente, com backup.
- Defina a origem pública da API no frontend e permita essa origem em `CORS_ORIGIN`.
- HTTPS é obrigatório para instalação PWA e Web Push.

# Teste do BD2 pelo navegador (demo)

Este deploy é exclusivamente para demonstração da interface e dos fluxos do sistema.

## Publicação

1. Abra o repositório na branch `feature/pwa-notificacoes-agenda`.
2. No Render, escolha **New + → Blueprint** e conecte o repositório GitHub.
3. Selecione a branch `feature/pwa-notificacoes-agenda` e confirme a criação do serviço descrito em `render.yaml`.
4. Aguarde o build do Docker e o health check em `/api/saude`.
5. O Render exibirá um endereço HTTPS `*.onrender.com`; use esse endereço no navegador.

O Blueprint usa o plano gratuito do Render. Serviços gratuitos podem entrar em suspensão após inatividade e demorar para voltar quando acessados. Não é uma garantia de disponibilidade contínua.

## Acessos para demonstração

- Site do cliente: página inicial do endereço publicado.
- Painel: acrescente `/login` ao endereço.
- E-mail: `admin@mariana.com`
- Senha: `admin123`

Essas credenciais são públicas e exclusivas do modo demo. Nunca as reutilize em produção.

## Limitações importantes

- `MODO_DEMO=true`: os dados ficam em memória e desaparecem quando o serviço reinicia ou é redeployado.
- Google Sheets fica desativado no modo demo. Para testar sincronização real é necessário configurar MySQL persistente, executar as migrações e cadastrar as credenciais da conta de serviço no ambiente do backend.
- Web Push também não fica validado por este deploy de demonstração.
- Não cadastre dados pessoais ou informações reais de clientes.
- O endereço só existe depois que o usuário conectar a conta Render e concluir a criação do Blueprint. O repositório não cria a conta nem publica sozinho.

## Para encerrar

Exclua o serviço de demonstração no painel Render quando terminar os testes. Antes de publicar a versão real, substitua o modo demo por MySQL, credenciais administrativas próprias, segredos fortes e as migrações correspondentes.

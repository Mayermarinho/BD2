# Antes de enviar o projeto para o grupo

> Windows (`cmd`). Tempo estimado: **1h30 a 2h**. Faça **na ordem**: a Parte 3 (segurança) vem antes de
> divulgar o link, porque o repositório é **público**.
> Hoje é 02/11/2026; a entrega do Relatório Final e do vídeo é **06/11** (Samara).
> Pasta do projeto no seu computador: `C:\Users\viros\OneDrive\Desktop\BD2\BD2`.

## Parte 1. Atualizar o código e instalar (5 min)

```
cd C:\Users\viros\OneDrive\Desktop\BD2\BD2
git status
git pull
cd backend
npm install
cd ..\frontend
npm install
```
- `git status` deve mostrar a árvore limpa antes do `git pull`. Se mostrar arquivos alterados que você não conhece, **não** use `git reset --hard`: me envie a lista.
- Se `git pull` reclamar da branch: `git fetch origin`, `git checkout arena/01a0efcc-bd2` e `git pull`.

## Parte 2. Testes automáticos (5 min)

```
cd C:\Users\viros\OneDrive\Desktop\BD2\BD2\backend
npm test
cd ..\frontend
npm test
npm run build
```
**Esperado:** backend **46 passaram**, frontend **21 passaram**, e o build termina com `built in ...`.
Se algum falhar, **pare** e me envie o texto do erro (sem senhas).

## Parte 3. Segurança (15 min, obrigatório)

O repositório está no GitHub **público**. Confira cada item:

| # | O que fazer | Como |
|---|---|---|
| 3.1 | **Trocar a senha do MySQL** que já apareceu em conversa e em um documento antigo do repositório (`admin123admin`, está no histórico do Git; não dá para apagar do histórico público). | No DBeaver, em um editor SQL: `ALTER USER 'root'@'localhost' IDENTIFIED BY 'NOVA_SENHA_FORTE';`. Depois atualize a `DATABASE_URL` em `backend\.env`. Se a senha tiver `@`, `#`, `/` ou `:`, codifique (ver `backend\.env.example`). Teste com `npm run dev` no `backend`. |
| 3.2 | O `.env` **não** está no Git. | `cd ..\BD2` e `git ls-files` + procure por `.env`: só `backend/.env.example` pode aparecer. Atalho: `git ls-files \| findstr /i "\.env"`. |
| 3.3 | Nenhuma senha ou `DATABASE_URL` real nos arquivos. | `git grep -n -I "mysql://"` deve mostrar só exemplos com `USUARIO:SENHA`. |
| 3.4 | **Trocar a senha do painel** (hoje é `admin`, fraca). | No `backend`: `node -e "console.log(require('bcryptjs').hashSync('SUA_SENHA_FORTE',10))"`. No DBeaver: `UPDATE usuario SET senha_hash='COLE_O_HASH' WHERE email='admin@mariana.com';`. Se usar `npm run verificar`, ponha a mesma senha em `ADMIN_SENHA` no `.env`. |
| 3.5 | `JWT_SECRET` longo e único (no `.env`). | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` e cole em `JWT_SECRET=`. Cada integrante usa o seu. |
| 3.6 | Nada de dados reais da profissional sem a autorização dela (telefone, endereço, fotos, nomes de clientes). | Revise `frontend\src\marca.js` e os prints. Dados de teste são fictícios. |
| 3.7 | `admin123` e `03_dev_admin.sql` são **só para desenvolvimento**. | Está avisado no README. Não use em banco que outras pessoas acessam. |

## Parte 4. Dados do salão e identidade (10 min)

Em `frontend\src\marca.js`, troque os **placeholders**: endereço ("Rua Exemplo, 123"), horário, telefone/WhatsApp e Instagram.
O nome "Studio Aurora", o logo e a paleta são **definitivos**: não mexa.
- Se mudar nome ou cores, ajuste também `frontend\public\manifest.webmanifest` (PWA).
- As fotos dos serviços são **geradas por IA**: avise isso no relatório ou troque por fotos reais, com autorização.
- Depois de mudar: `cd frontend`, `npm test` e `npm run build`.

## Parte 5. Banco limpo e verificação no MySQL real (20 min)

1. **Banco limpo para o teste:** no DBeaver, execute **na ordem** `database\mysql\01_schema_original.sql`, `02_melhorias.sql`, `03_dev_admin.sql` e `04_conta_cliente.sql` (o `01` apaga e recria o banco). O `03` volta a senha do painel para `admin123`: coloque `ADMIN_SENHA=admin123` no `.env` (ou refaça a 3.4 depois).
2. **Rodar a verificação:**
   ```
   cd C:\Users\viros\OneDrive\Desktop\BD2\BD2\backend
   npm run verificar
   ```
   **Esperado:** `TUDO CERTO: 27 verificações OK.` O resultado fica em `backend\resultado-verificacao.txt` (guarde: é evidência para o relatório).
3. **Se algo falhar:** copie a linha `FALHOU` (o texto depois de `->` diz o que houve) e me envie, sem senhas.
4. **Testes do trigger (opcional, vira print):** abra `database\mysql\testes\teste_trigger.sql` no DBeaver e rode bloco a bloco.
5. **Limpeza:** o script deixa dados `[TESTE]`. Rode de novo `01`, `02`, `03` e `04` para zerar, e refaça a **3.4** (senha forte do painel).
6. **Cadastre os dados reais ou de demonstração** pelo painel (serviços, horários de atendimento): serve de ensaio para o vídeo.

## Parte 6. Conferência manual das telas (25 min)

Suba o sistema com `iniciar.bat` (na pasta `BD2`; ele abre a API e o site em duas janelas) e abra `http://localhost:5173`. Marque cada item:

**Cliente**
- [ ] Home mostra os serviços; botão **Agendar** leva a "Como você prefere continuar?".
- [ ] Agendar **sem conta**: escolher data futura e horário, preencher os dados, ver a confirmação.
- [ ] O horário que acabou de agendar **não aparece mais** para o mesmo serviço.
- [ ] Criar **conta**, agendar logada (sem digitar dados de novo).
- [ ] **Minha conta → Remarcar**: escolher outro dia/horário, ver a mensagem de sucesso e o horário novo na lista.
- [ ] **Cancelar** pela conta; cancelar sem conta pelo número + telefone (`/cancelar`).
- [ ] Sair e tentar abrir `/admin` com a conta de cliente: deve ser recusado.

**Profissional (login em `/entrar`)**
- [ ] **Painel** (resumo): números aparecem sem erro.
- [ ] **Agenda:** o agendamento aparece; **Confirmar**, **Concluir**, **Cancelar** (com motivo).
- [ ] **Agenda → Remarcar:** escolher novo horário; aparece o botão **Avisar pelo WhatsApp** com a mensagem pronta.
- [ ] **Serviços:** criar, editar preço, desativar. **Categorias:** criar, editar, excluir (esta parte nunca foi conferida na tela: olhe com atenção).
- [ ] **Horários e folgas:** criar uma folga; o dia deixa de aparecer para o cliente; remover a folga.
- [ ] **Clientes:** busca por nome/telefone; **Ver histórico** de uma cliente.
- [ ] **Relatórios:** mês atual, mês passado, **Baixar lista (CSV)** abre no Excel.

**Celular** (veja `docs/PASSO_A_PASSO_FINAL.md`, Partes 7 e 8, e `docs/MOBILE.md`)
- [ ] Abre no celular (mesmo Wi-Fi ou túnel `cloudflared`).
- [ ] Layout legível, botões fáceis de tocar, agendamento funciona.
- [ ] Instalar na tela inicial (precisa de HTTPS, ou seja, o túnel) e abrir pelo ícone.

Anote o que estiver estranho (print + o que esperava). Erros de verdade: me envie.

## Parte 7. Testar como um colega vai testar (15 min)

A melhor prova de que o projeto está pronto é **outra pessoa conseguir rodar do zero**. Simule:
```
cd C:\Users\viros\OneDrive\Desktop
mkdir teste-grupo
cd teste-grupo
git clone https://github.com/Random01-01/BD2.git
cd BD2
git checkout arena/01a0efcc-bd2
```
Siga **somente o README, seção 4.1 (modo demo)**: `npm install` no `backend` e no `frontend`, e `iniciar.bat demo`.
Se algo não funcionar só com o README, **o README precisa de correção**: me diga onde travou.
Depois apague a pasta `teste-grupo`.

## Parte 8. Documentação e Git (10 min)

- [ ] **README, seção 1 (situação atual):** reflete o que está pronto (remarcar, clientes e relatórios agora estão ✅).
- [ ] **`docs/PROXIMAS_ETAPAS.md` (seção 5) e README (seção 11):** decisões em aberto do grupo (status inicial CONFIRMADO ou PENDENTE, prazo de cancelamento, passo de 30 min). Leve para a reunião.
- [ ] Mensagens de commit em português e claras.
- [ ] No GitHub (no navegador, **aba anônima**): o README aparece certinho, não há `.env`, e a pasta `docs/` abre.
- [ ] `git status` limpo e `git log origin/arena/01a0efcc-bd2..HEAD` sem nada (tudo enviado).

## Parte 9. Enviar ao grupo (10 min)

1. Link: **https://github.com/Random01-01/BD2** (branch `arena/01a0efcc-bd2`).
2. Se alguém precisar **enviar alterações**, adicione como colaborador: GitHub → *Settings* → *Collaborators* → *Add people*. Quem só vai ler ou rodar não precisa.
3. Mensagem sugerida:

> **Pessoal, o sistema Studio Aurora está pronto para teste.** Link: https://github.com/Random01-01/BD2
> Para rodar sem banco (só ver): instale o Node.js LTS e o Git; `git clone`, depois `git checkout arena/01a0efcc-bd2`.
> Siga o **README, seção 4.1** (modo demo, `iniciar.bat demo`). Login do painel no demo: `admin@mariana.com` / `admin123`.
> O que testar: agendar, remarcar, cancelar, e no painel: agenda, serviços, horários, clientes e relatórios.
> **Não mandem senhas nem o arquivo `.env`** no grupo nem no GitHub. Problemas: abram uma *issue* ou mandem print.
> Prazos: roteiro do vídeo (Amanda e Marcela) até **qua 04/11**; gravação e revisão (todos) **qui 05/11**; entrega do relatório e do vídeo (Samara) **sex 06/11**.
> Roteiro do vídeo: `docs/ROTEIRO_VIDEO.md`. Rascunho do relatório: `docs/RELATORIO_FINAL_RASCUNHO.md`.

## Parte 10. O que o grupo ainda precisa fazer (Q7: 02 a 06/11)

| Quem | O quê | Até |
|---|---|---|
| Você | Partes 1 a 9 acima; mandar o `resultado-verificacao.txt` | 03/11 |
| Amanda e Marcela | Ajustar e fechar o `docs/ROTEIRO_VIDEO.md` (preencher nomes) | 04/11 |
| Samara | Montar o Relatório Final a partir de `docs/RELATORIO_FINAL_RASCUNHO.md` (preencher os **[PREENCHER]**) | 05/11 |
| Todos | Gravar as cenas, revisar vídeo e relatório | 05/11 |
| Samara | **Entregar relatório e vídeo no AVA** | **06/11** |

## Limitações conhecidas (diga com franqueza no relatório)
- Interface **não validada com a profissional** nem com clientes; sem auditoria formal de acessibilidade.
- Execução **local** (não publicado na nuvem); dados de exemplo.
- Sem verificação de e-mail/telefone, sem "esqueci a senha", sem aviso de privacidade (LGPD).
- Sem pagamento online e sem lembretes automáticos (há só o link do WhatsApp).
- `npm audit` do frontend: 2 avisos moderados em `react-router-dom` (atualizar exige versão maior; fica como melhoria).
- **Faltava rodar no MySQL real** os passos novos (remarcar, clientes, relatórios): a Parte 5 resolve.

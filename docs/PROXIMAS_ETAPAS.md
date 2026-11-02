# Próximas etapas e instruções

> Atualizado em **02/11/2026**: a Quinzena 6 terminou em 01/11 e estamos na **Quinzena 7 (02/11 a 06/11)**, a da entrega. **Restam 4 dias.** Não criar novas funções: priorizar a seção 0.

## 0. Plano de emergência (02/11 a 06/11)

| Dia | O que fazer |
|---|---|
| **Seg 02 a ter 03** | Rodar `npm run verificar` no MySQL real (seção 3) e anexar `resultado-verificacao.txt`. Refazer o Teste 3 do Parcial com print. Combinar a sessão com a profissional. |
| **Ter 03 a qua 04** | Sessão de validação com a profissional (seção 6.5) e testes rápidos de acessibilidade/celular (6.3). Registrar com prints. |
| **Qua 04 a qui 05** | Gravar o vídeo (roteiro na seção 8.2, usando o `npm run demo` ou o banco real) e fechar o texto do Relatório Final. |
| **Qui 05 a sex 06** | Revisão coletiva e **entrega em 06/11** (Samara). |

O que **não** entra agora e vai para "trabalhos futuros" no relatório: remarcar horário, clientes e relatórios no painel, lembretes por WhatsApp, app nativo e publicação na nuvem.
 Datas e responsáveis seguem o
> [Plano de Ação](../PLANO%20DE%20A%C3%87%C3%83O%20GRUPO%204.pdf). Onde o Plano não diz quem faz algo novo, está
> marcado como **sugestão**: o grupo decide.

## 1. Onde estamos

**Pronto e testado só com dados em memória** (backend 33 testes, frontend 13 testes):
site do cliente (home, agendar com ou sem conta, cancelar, conta de cliente), painel da profissional (dashboard,
agenda, serviços, horários e folgas) e regra anti-conflito de horário.

**O que ninguém ainda fez:** rodar tudo contra um **MySQL de verdade**. Os scripts `.sql` e o arquivo
`backend/src/repos/mysql.js` nunca foram executados. É o maior risco do projeto e por isso é o **passo 1**.

## 2. Visão geral (linha do tempo)

| Quando | Etapa | O que entrega | Responsáveis no Plano |
|---|---|---|---|
| **21/10 a 24/10** (sugestão) | **A. Validar no MySQL real** | Roteiro da seção 3 cumprido e resultados registrados | Mayer e Samara (integração) + Todos (testes preliminares) |
| **22/10 a 27/10** (sugestão; depois disso, **congelar** novas funções) | **B. Fechar o que falta do sistema** | Clientes, relatórios e remarcar (seção 4); decisões em aberto (seção 5) | Edinaldo e Lucas (serviços); Amanda e Marcela (agendamento); Mayer e Nicolas (acessibilidade) |
| **25/10 a 01/11** | **C. Testes e validação** (a Quinzena 6 já começou: ir testando enquanto B termina) | Testes funcionais, integração, acessibilidade; validação com a profissional (seção 6) | Edinaldo e Lucas; Nicolas; Amanda e Marcela; Mayer e Samara; Todos |
| **02/11 a 06/11** | **D. Vídeo e Relatório Final** | Vídeo e relatório entregues em **06/11** (seção 8) | Amanda e Marcela (roteiro); Samara (relatório e entrega); Todos (revisão) |
| Opcional | **E. Publicar na internet** | Site no ar com endereço (seção 7) | sugestão: Mayer e Nicolas |

---

## 3. Etapa A: validar no MySQL real (fazer primeiro)

**Quem:** quem tiver MySQL e Workbench instalados (Mayer e Samara, pelo Plano), com os demais acompanhando.
**Tempo estimado:** 1 a 2 horas.

### 3.1 Preparar o banco

1. Atualize o projeto: `git pull`.
2. Abra o **MySQL Workbench**, conecte como `root` e execute **nesta ordem** (File > Open SQL Script, depois o raio ⚡):
   1. `database\mysql\01_schema_original.sql`: cria o banco `sistema_agendamento`.
      ⚠️ **Ele apaga o banco e recria** (`DROP DATABASE`). Rode uma vez; rodar de novo apaga os dados.
   2. `database\mysql\02_melhorias.sql`: **só uma vez** (rodar duas vezes dá erro de coluna duplicada).
   3. `database\mysql\03_dev_admin.sql`: cria a administradora de teste (`admin@mariana.com` / `admin123`). **Só para desenvolvimento.**
   4. `database\mysql\04_conta_cliente.sql`: cria a tabela de contas de cliente (pode repetir sem problema).
3. Se aparecer **erro vermelho** em qualquer script: **pare**, tire print da mensagem inteira (com o número do erro) e
   do trecho do script, e mande. Não tente "consertar" o script no escuro.

   *Alternativa com Docker Desktop:* `docker compose up -d` na raiz do projeto cria o MySQL e roda os 4 scripts sozinho.

### 3.2 Configurar a API

No `cmd`, dentro da pasta `backend`:

```
copy .env.example .env
notepad .env
```

No `.env`, preencha:

```
DATABASE_URL=mysql://root:SUA_SENHA@localhost:3306/sistema_agendamento
JWT_SECRET=cole-aqui-um-texto-aleatorio-de-32-ou-mais-caracteres
```

Para gerar o `JWT_SECRET`: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

🔒 **Nunca** envie o `.env` ao GitHub (já está no `.gitignore`) e **nunca** cole a senha do banco em chat, issue ou commit.

Depois:

```
npm install
npm start
```

(sem `demo`, a API usa o MySQL). Abra `http://localhost:3001/api/saude`: deve aparecer `{"ok":true}`. Se der erro de
conexão, a mensagem do terminal diz o motivo (senha, porta, banco inexistente).

Em outro terminal: `cd frontend`, `npm install`, `npm run dev`, e abra `http://localhost:5173`.

### 3.3 Verificação automática (rode primeiro) e roteiro manual

**Atalho:** com o `.env` pronto e a API **parada** (feche o `npm start`), rode na pasta `backend`:

```
npm run verificar
```

O script usa o MySQL do `.env`, executa 20 verificações (serviço, horários, agendamento, conflito, **concorrência com 6 pedidos simultâneos**, **trigger do banco**, cancelamento, folga e conta de cliente) e escreve `OK` ou `FALHOU` em cada uma. O resultado fica salvo em `backend/resultado-verificacao.txt` (sem senhas, com a versão do MySQL): **anexe ao Relatório Final e mande o arquivo se algo falhar**.

- Precisa do `03_dev_admin.sql` executado (login `admin@mariana.com` / `admin123`), ou use as variáveis `ADMIN_EMAIL` e `ADMIN_SENHA`.
- Grava dados de teste marcados com `[TESTE]` e, no fim, cancela os agendamentos e desativa o serviço. As contas de cliente de teste (`teste-...@exemplo.com`) ficam no banco. **Use o banco de desenvolvimento, nunca o de uso real.**
- `npm run verificar:demo` roda o mesmo roteiro em memória (sem banco), só para ver o script funcionando.

Depois, o roteiro manual abaixo confere o que o script não vê (telas e visual). Marque ✅ ou ❌:

| # | O que fazer | Resultado esperado | Resultado |
|---|---|---|---|
| 1 | Abrir `/api/saude` | `{"ok":true}` | |
| 2 | Entrar em `/entrar` com `admin@mariana.com` / `admin123` | Abre o painel (dashboard) | |
| 3 | Painel > Serviços: criar "Corte feminino", R$ 60, 60 min | Aparece na lista e na home | |
| 4 | Painel > Serviços: editar o preço e desativar | Some do site e continua no painel | |
| 5 | Painel > Horários: cadastrar seg a sex, 09:00 às 18:00 | Salva sem erro | |
| 6 | Painel > Horários: cadastrar horário que sobrepõe outro | Recusa com mensagem clara | |
| 7 | Na home, agendar sem conta (escolha uma data útil) | Confirmação com número do agendamento | |
| 8 | Repetir o **mesmo** serviço, data e horário | O horário **não aparece mais** como livre | |
| 9 | Tentar um horário que cobre parte de outro agendamento (serviço de 2 h) | Só oferece horários que cabem | |
| 10 | **Concorrência:** abrir dois navegadores, chegar ao mesmo horário e clicar em confirmar quase juntos | Um agenda; o outro recebe "horário não está mais disponível" | |
| 11 | Painel > Agenda: confirmar, concluir e cancelar um agendamento | Status muda e o horário cancelado volta a ficar livre | |
| 12 | Painel > Horários: criar folga para um dia | Aquele dia some das opções do cliente | |
| 13 | Painel > Serviços: excluir serviço **com** agendamento | Recusa (não perde histórico) | |
| 14 | Criar conta de cliente em `/cadastro` e entrar | Abre "Minha conta" | |
| 15 | Cadastrar o **mesmo e-mail** de novo | Recusa: e-mail já cadastrado | |
| 16 | Agendar logada e cancelar em "Meus agendamentos" | Aparece e cancela sem pedir telefone | |
| 17 | No Workbench: `SELECT * FROM agendamento;` | Linhas coerentes com o que foi feito no site | |
| 18 | No Workbench, tentar inserir à mão dois agendamentos sobrepostos (mesma profissional) | O **trigger** bloqueia com erro | |

**Se algo falhar, mande:** o número do teste, o texto da mensagem na tela, as últimas linhas do terminal da API
(`npm start`) e, se houver, o código de erro do MySQL (ex.: `ER_...` ou número `1451`). Com isso eu corrijo.

**Pronto quando:** os 18 testes estão ✅ (ou os ❌ foram corrigidos e repetidos). Guarde **prints** dos testes 2, 7, 10 e 18:
servem de evidência no Relatório Final.

---

## 4. Etapa B: o que falta construir (até 27/10, depois congelar)

> **Prazo curto:** restam ~11 dias da Quinzena 6. Por isso, a ordem abaixo já considera cortar: **remarcar** e **WhatsApp** podem virar "trabalhos futuros" no Relatório Final se o tempo apertar. Clientes e relatórios (itens 2 e 3) são o mínimo útil para a profissional.

Em ordem de prioridade (as duas primeiras são as que mais pesam para a profissional):

| Prioridade | Item | O que inclui | Estado |
|---|---|---|---|
| 1 | **Remarcar horário** | Cliente (com conta) e profissional trocam data/hora de um agendamento, respeitando conflitos | ⏳ a construir |
| 2 | **Painel: clientes** | Lista com busca por nome/telefone, histórico de cada cliente, observações | ⏳ a construir |
| 3 | **Painel: relatórios** | Agendamentos por período, serviços mais pedidos, cancelamentos e faturamento estimado (usa `preco_cobrado`) | ⏳ a construir |
| 4 | **Acessibilidade e celular** | Itens da seção 6.3, corrigindo o que a auditoria apontar | ⏳ |
| 5 | **Atualizar o `react-router-dom`** | O `npm audit` aponta 2 avisos moderados nessa biblioteca; atualizar e rodar os testes | ⏳ antes de publicar |
| 6 | **Lembretes por WhatsApp** | Hoje só há um link `wa.me`. Automático exige API paga: deixar como melhoria futura no relatório | ⏳ opcional |

> Eu (Arena) implemento 1, 2, 3 e 5 em etapas, com testes a cada uma. Para começar, diga **"pode começar a Etapa 3"**
> e eu faço na ordem acima. Se a profissional preferir outra ordem, avise.

---

## 5. Decisões que o grupo precisa tomar (reunião curta)

Marque a decisão e me avise para eu ajustar o sistema e a documentação. A coluna da direita é a minha sugestão.

| Decisão | Opções | Sugestão |
|---|---|---|
| Agendamento nasce **confirmado** ou **pendente** (a profissional aprova)? | `STATUS_INICIAL=CONFIRMADO` ou `PENDENTE` | Perguntar à profissional. Se ela quiser controle, `PENDENTE` |
| Antecedência mínima para agendar | hoje: 60 min (`ANTECEDENCIA_MINUTOS`) | Combinar com a profissional |
| Prazo para o cliente cancelar | hoje: até o horário começar | Definir (ex.: 2 h antes) |
| Intervalo entre horários oferecidos | hoje: 30 min (`PASSO_MINUTOS`) | Combinar com a profissional |
| "Pagamentos" (citado no Parcial) | só registrar valor, ou criar tabela própria | Só registrar valor (`preco_cobrado`) e explicar no relatório |
| Banco de dados | Plano diz PostgreSQL, sistema usa MySQL | **Manter MySQL** e registrar a mudança e o motivo no Relatório Final |
| Verificação de e-mail/telefone e "esqueci a senha" | não existem hoje | Deixar como melhoria futura |
| Nome, logo e cores definitivos | ✅ **Decidido:** "Studio Aurora", logo (tesoura + brilho) e paleta atual | Falta só trocar endereço, telefone e Instagram em `marca.js` |

---

## 6. Etapa C: testes e validação (19/10 a 01/11, em andamento)

### 6.1 Testes funcionais (Edinaldo e Lucas)
Repetir o roteiro da seção 3.3 já no ambiente final e acrescentar:

- Cadastro, edição, desativação e exclusão de serviços (com valores inválidos: preço negativo, nome vazio, duração 0).
- Consulta de serviços por categoria na home.
- Agendamento com todos os campos errados (telefone curto, e-mail inválido, data passada).
- Cancelar pelo número e telefone; cancelar com telefone errado (deve recusar).

Registrar em planilha: **caso, passos, resultado esperado, resultado obtido, ok/não ok, data e quem testou**.
Para cada erro, abrir uma *issue* no GitHub com print e passos para repetir.

### 6.2 Integração interface, API e banco (Nicolas)
- Subir os três (MySQL, API, site) e percorrer o fluxo completo do cliente e da profissional.
- Parar a API no meio de uma ação e ver se o site mostra mensagem amigável ("Servidor indisponível").
- Conferir no Workbench se o que aparece no site bate com o que está nas tabelas.
- Rodar `npm test` em `backend` e `frontend`: tudo verde antes de cada entrega.

### 6.3 Acessibilidade, usabilidade e responsividade (Amanda e Marcela)

| Teste | Como fazer | Meta |
|---|---|---|
| Teclado | Navegar só com Tab, Enter e Esc (sem mouse) | Dá para agendar do início ao fim; o foco aparece sempre |
| Leitor de tela | NVDA (gratuito, Windows) ou TalkBack (Android) | Botões e campos têm nome; erros são lidos |
| Contraste | Extensão **WAVE** ou **axe DevTools** no navegador | Sem erros de contraste |
| Lighthouse | F12, aba Lighthouse, categoria Acessibilidade | Nota 90 ou mais |
| Zoom | Ampliar para 200% | Nada some nem fica cortado |
| Celular | Testar com larguras de 360, 390 e 768 px (F12, modo dispositivo) e em celular real | Sem rolagem lateral; botões fáceis de tocar |
| Usabilidade | Pedir a 3 a 5 pessoas (incluindo a profissional) que agendem sem ajuda; anotar onde travam e quanto tempo levam | Registrar problemas e correções |

Registrar os resultados com prints: viram a seção de acessibilidade e usabilidade do Relatório Final.
(No Parcial, a usabilidade foi avaliada só com o DER. Agora há um sistema de verdade para testar.)

### 6.4 Correções (Mayer e Samara)
Corrigir o que as issues apontarem, na ordem: erros que impedem agendar, depois dados errados, depois visual.

### 6.5 Validação com a profissional (Todos, até 01/11)
Sessão de 30 a 40 minutos, de preferência em um computador e um celular dela:

1. Ela mesma agenda um horário (sem ajuda) e cancela.
2. Ela entra no painel, cadastra um serviço, define horários e uma folga.
3. Ela vê a agenda do dia e muda o status de um agendamento.
4. Perguntas: o que falta? O que confunde? Usaria no dia a dia? Os textos e preços estão certos?
5. Registrar as respostas e **a data**. Se possível, pedir um depoimento curto ou ata assinada/enviada por mensagem.

---

## 7. Etapa E: publicar na internet (opcional)

Só faz sentido depois da Etapa A. Para o projeto, o sistema rodando no computador do grupo já atende, mas ter um
endereço público facilita a validação com a profissional e o vídeo.

**Estrutura típica:** site (arquivos estáticos do `npm run build`), API Node e banco MySQL, cada um em um serviço.
Existem serviços com plano gratuito para cada parte (confira condições e limites atuais antes de escolher: mudam com frequência).

**Checklist antes de publicar:**
- [ ] `JWT_SECRET` novo e forte (diferente do de desenvolvimento).
- [ ] **Não** executar `03_dev_admin.sql`; criar a administradora real com senha forte (e trocar a `admin123`).
- [ ] `CORS_ORIGIN` com o endereço real do site; `DB_SSL` conforme o provedor; só HTTPS.
- [ ] Atualizar `react-router-dom` e rodar `npm audit` no backend e frontend.
- [ ] Trocar as fotos ilustrativas por fotos reais do salão (e comprimir: cada JPG tem ~200 KB).
- [ ] Nome, contatos, endereço e horários reais em `frontend/src/marca.js`.
- [ ] **LGPD:** o sistema guarda nome, telefone e e-mail. Incluir um aviso curto de privacidade (para que os dados são usados, quem acessa, como pedir exclusão) e o consentimento no cadastro.
- [ ] Senha que já apareceu em conversa (`admin123admin`) **deve ser trocada**.

---

## 8. Etapa D: Vídeo e Relatório Final (02/11 a 06/11)

### 8.1 Relatório Final (Samara, com revisão de todos)
Reaproveitar o `docs/REVISAO_RELATORIO_PARCIAL.md`, que lista o que corrigir em relação ao Parcial:

- Banco: PostgreSQL no Plano, **MySQL** no sistema (justificar).
- 8 tabelas (com `conta_cliente`) e **DER atualizado** (o do Parcial está desatualizado).
- "Pagamentos": explicar que só se registra o valor cobrado.
- A estatística de "80% dos conflitos" precisa de fonte ou deve ser reformulada.
- A prevenção de conflito tem dois níveis (trigger + trava na API); explicar o limite do trigger sozinho.
- Resultados: testes automatizados (33 + 13), roteiro do MySQL (seção 3.3), acessibilidade (6.3), validação com a profissional (6.5), prints.
- Limitações e trabalhos futuros: lembretes automáticos, verificação de e-mail, pagamento online, remarcação (se não ficar pronta).
- Referências e formatação conforme modelo da UNIVESP/ABNT.

### 8.2 Vídeo (roteiro: Amanda e Marcela)
Sugestão de sequência (5 a 7 minutos, conforme limite do AVA):

1. **Problema:** como a profissional agenda hoje e o que dá errado.
2. **Solução:** o que o sistema faz (uma frase).
3. **Demonstração (3 min):** cliente escolhe serviço, agenda, vê confirmação; profissional vê na agenda; tentativa de horário já ocupado.
4. **Tecnologias:** React, Node/Express, MySQL (um slide).
5. **Resultados e validação:** testes, acessibilidade, fala/depoimento da profissional.
6. **Conclusão e próximos passos.**

Dica: ensaiar com o **modo demo**, que tem dados prontos e não depende do banco, e gravar com o sistema limpo.

---

## 9. Como o grupo deve trabalhar no repositório

- Antes de mexer: `git pull`. Depois: `git add`, `git commit -m "mensagem clara"` e `git push`.
- A branch de trabalho é `arena/01a0efcc-bd2`. A antiga `main` virou `Arq` e **não deve ser alterada**.
- Nunca enviar `.env`, senhas ou tokens. Repositório é **público**.
- Erros encontrados: abrir uma *issue* com título curto, passos para repetir, resultado esperado e print.
- Mudou a regra de negócio ou o banco? Atualizar o `README.md` e o `docs/MODELAGEM.md` no mesmo commit.

## 10. Riscos e como reduzir

| Risco | Efeito | O que fazer |
|---|---|---|
| MySQL real revelar erros no `repos/mysql.js` | Atrasa tudo | Etapa A **agora**; mandar os erros logo |
| Profissional pedir mudanças tarde | Retrabalho na reta final | Mostrar o sistema a ela **já nesta quinzena** (modo demo) |
| Pouco tempo na Quinzena 7 | Relatório apressado | Ir escrevendo as seções do relatório durante a Quinzena 6 |
| Visual de celular só testado em simulador | Surpresas na validação | Testar em celular real na Etapa C |
| Endereço, telefone e Instagram ainda de exemplo | Dados falsos no vídeo | Trocar em `frontend/src/marca.js` antes de gravar |

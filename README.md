# Sistema Web para Gestão de Serviços e Agendamentos

> Uma solução tecnológica para profissionais autônomos — **Projeto Integrador em Computação II · UNIVESP · Grupo 4** · Polos Guararapes, Araçatuba e Ilha Solteira · 2026

Sistema web para uma profissional autônoma da área da beleza (cenário inicial: cabeleireira) organizar **serviços, preços e horários de atendimento**, enquanto os **clientes consultam horários livres e agendam sozinhos**, pelo computador ou pelo celular. O objetivo é acabar com os conflitos de horário causados pelo controle manual (caderno e WhatsApp).

**Integrantes:** Amanda Rodrigues Pinheiro · Edinaldo Cruz da Silva · Lucas Barcello Daloco · Marcela Natália Liberato Giacometti · Mayer Marinho Leandro · Nicolas Caliel Picussa · Samara da Silva Nascimento

---

## Sumário
1. [Situação atual](#1-situação-atual)
2. [Tecnologias](#2-tecnologias)
3. [Estrutura do repositório](#3-estrutura-do-repositório)
4. [Primeiros passos (do zero)](#4-primeiros-passos-do-zero)
5. [Como o sistema funciona](#5-como-o-sistema-funciona)
6. [API](#6-api)
7. [Testes](#7-testes)
8. [Como trabalhamos (Git)](#8-como-trabalhamos-git)
9. [Segurança](#9-segurança)
10. [Cronograma e próximos passos](#10-cronograma-e-próximos-passos)
11. [Decisões em aberto](#11-decisões-em-aberto)
12. [Documentação](#12-documentação)

---

## 1. Situação atual

| Funcionalidade | Estado |
|---|---|
| Banco de dados MySQL (7 tabelas + trigger anti-conflito) — Relatório Parcial | ✅ |
| Melhorias do banco (`preco_cobrado`, validações, folgas) | ✅ script pronto (`02_melhorias.sql`) |
| API: serviços, horários livres, agendar, cancelar | ✅ |
| API: login e agenda da profissional, mudar status | ✅ |
| **Página inicial** com apresentação dos serviços (filtro por categoria), como funciona e contato | ✅ |
| Agendar: serviço → *entrar / criar conta / continuar sem conta* → data/horário → confirmação | ✅ |
| Site do cliente: cancelar horário sem conta (nº + telefone) | ✅ |
| **Conta opcional de cliente**: cadastro, login, “Meus agendamentos” e cancelar sem digitar nº/telefone | ✅ |
| Login único (cliente → Minha conta; profissional → painel) | ✅ |
| Identidade visual editável em um arquivo (`frontend/src/marca.js`): paleta azul suave + rosa quartzo + ameixa, desenhos de fundo em linha fina (`frontend/src/desenhos.jsx`) — **nome “Studio Aurora”, cores e logo definidos pelo grupo**; endereço/telefone/Instagram ainda são exemplos e as fotos são ilustrações geradas por IA em `frontend/public/img/` | ✅ |
| Painel: login + **dashboard** (hoje, próximos 7 dias, pendentes, próximos atendimentos) | ✅ |
| Painel: **agenda** por dia e por semana (confirmar, concluir, cancelar) | ✅ |
| Painel: cadastro de **serviços** e categorias (criar, editar, ativar/desativar, excluir) | ✅ |
| Painel: **horários de atendimento** e folgas/feriados | ✅ |
| **App instalável no celular (PWA)**: Android (botão “Instalar”) e iPhone (passo a passo); funciona em endereço https | ✅ código pronto — **precisa de site publicado para testar a instalação** |
| App nativo (Play Store / App Store) | ⏳ melhoria futura (ver `docs/MOBILE.md`) |
| Remarcar horário pela conta do cliente | ⏳ |
| Painel: clientes e relatórios | ⏳ etapa 3 |
| Lembretes por WhatsApp | ⏳ melhoria futura (hoje só um link `wa.me`) |
| Publicação na nuvem | ⏳ |
| Auditoria de acessibilidade e validação com a profissional | ⏳ Quinzenas 5–6 |

> ⚠️ **Ainda não testado contra um MySQL real:** a camada `backend/src/repos/mysql.js` foi escrita e revisada, mas só foi executada com testes em memória. O primeiro passo no seu computador é a seção [4.2](#42-rodar-com-o-mysql-de-verdade).

## 2. Tecnologias

| Camada | Tecnologia |
|---|---|
| Interface | React 18 + Vite + React Router (CSS próprio, mobile-first) |
| API | Node.js 18.11+ · Express · `mysql2` · JWT · bcrypt · helmet |
| Banco | MySQL 8.0.16+ (MySQL Workbench 8.0.36 nos testes do Relatório Parcial) |
| Testes | `node:test` (API) · Vitest + Testing Library (interface) |

## 3. Estrutura do repositório

```
BD2/
├── frontend/              # React: site do cliente e painel da profissional
├── backend/               # API Node/Express
│   └── src/repos/         #   mysql.js (toda a SQL) e memoria.js (testes/demo)
├── database/
│   ├── mysql/             # 01 (original), 02 (melhorias), 03 (senha de teste)
│   └── postgres/          # versão alternativa — NÃO usada no momento
├── docs/                  # modelagem, fluxos e revisão do Relatório Parcial
├── docker-compose.yml     # MySQL local opcional
├── PLANO DE AÇÃO GRUPO 4.pdf
└── RELATÓRIO-PARCIAL-PI-2026.pdf
```

## 4. Primeiros passos (do zero)

### 4.0 Instale uma vez
- **Git** — git-scm.com
- **Node.js LTS** (20 ou 22) — nodejs.org (já inclui o `npm`)
- **MySQL Server 8 + MySQL Workbench** — o mesmo usado no Relatório Parcial. *(Alternativa: Docker Desktop, seção 4.2-B.)*
- Um editor, por exemplo o VS Code.

Confira no terminal: `git --version`, `node -v` (precisa ser 18.11 ou maior) e `npm -v`.

### 4.1 Baixar o projeto e testar sem banco (modo demo)
```bash
git clone https://github.com/Random01-01/BD2.git
cd BD2
git checkout arena/01a0efcc-bd2      # branch de trabalho atual

# Terminal 1 — API com dados fictícios em memória
cd backend
npm install
npm run demo

# Terminal 2 — site
cd frontend
npm install
npm run dev                           # abra http://localhost:5173
```
- Site do cliente: `http://localhost:5173`
- Painel da profissional: `http://localhost:5173/admin` → `admin@mariana.com` / `admin123`

No modo demo nada é gravado em banco; os dados somem ao reiniciar. Serve para ver e mostrar a interface.

> **Os dois terminais precisam ficar abertos ao mesmo tempo.** Se o site mostrar "Servidor indisponível" ou "Ocorreu um erro" ao entrar, ou se o terminal do site mostrar `http proxy error ... ECONNREFUSED`, a **API (terminal 1) não está rodando**. Confira se o terminal 1 mostra `API no ar: http://localhost:3001/api/saude` e teste esse endereço no navegador.

### 4.2 Rodar com o MySQL de verdade

**A) MySQL Workbench**
1. Conecte em `localhost:3306` com o seu usuário (ex.: `root`).
2. Abra e execute, **nesta ordem**, os arquivos de `database/mysql/`:
   `01_schema_original.sql` → `02_melhorias.sql` → `03_dev_admin.sql` → `04_conta_cliente.sql`.
   (Rode o `02` só uma vez. Para recomeçar, rode o `01` de novo: ele recria o banco.)
3. Confira: `SELECT VERSION();` deve ser 8.0.16 ou maior, e `SELECT * FROM servico;` deve listar 4 serviços.

**B) Docker (alternativa)**: `docker compose up -d` na raiz já cria o banco com os 4 scripts. Usuário `root`, senha `agendamento_dev`.

**Configurar e subir a API**
```bash
cd backend
copy .env.example .env        # Mac/Linux: cp .env.example .env
```
Edite o `.env`:
```
DATABASE_URL=mysql://root:SUA_SENHA@localhost:3306/sistema_agendamento
JWT_SECRET=um-texto-longo-e-aleatorio-com-mais-de-16-caracteres
```
Se a senha tiver caracteres especiais (`@`, `#`, `/`), escreva-os codificados (`@` → `%40`).
```bash
npm run dev
```
Abra `http://localhost:3001/api/saude` → deve aparecer `{"ok":true}`. Depois `http://localhost:3001/api/servicos` → lista dos serviços. Em outro terminal, `cd frontend && npm run dev` e use o site normalmente.

**Verificar a ligação com o banco automaticamente** (com a API parada):
```bash
cd backend
npm run verificar
```
Roda 20 verificações no MySQL do `.env` (agendar, conflito, concorrência, trigger, cancelar, folga, conta de cliente) e salva `backend/resultado-verificacao.txt` para o relatório. Grava dados `[TESTE]`: use só o banco de desenvolvimento.

**Se algo der erro**, anote a mensagem do terminal (sem a senha) e abra uma *issue* ou fale com o grupo.

## 5. Como o sistema funciona

### Fluxo do cliente
1. Na **página inicial** vê os serviços (com preço e duração) e clica em **Agendar** no que quiser.
2. O sistema pergunta: **Entrar**, **Criar conta** ou **Continuar sem conta**.
3. Escolhe a **data**; o sistema mostra só os **horários livres**.
4. **Com conta:** só confirma (nome e telefone já vêm do cadastro). **Sem conta:** informa nome e telefone.
5. Com conta, acompanha e cancela em **Meus agendamentos**. Sem conta, guarda o **nº do agendamento** e cancela com nº + telefone.

A profissional entra pelo mesmo botão **Entrar** da página inicial e é levada ao painel.

**Para trocar nome, cores e textos do site**, edite só `frontend/src/marca.js` (nome definitivo: “Studio Aurora”; troque também endereço, telefone e Instagram, que ainda são exemplos).

### Regras de negócio
- Horários livres = grade semanal da profissional − folgas/feriados − agendamentos não cancelados; nunca no passado; com antecedência mínima quando for hoje.
- O horário oferecido respeita a **duração do serviço** (um serviço de 2 h só aparece se couber).
- **Sem conflito de horário**, em duas camadas: a API confere e o **trigger do banco** é a palavra final (HTTP 409). Cada reserva roda em transação com trava na profissional, para que duas pessoas não consigam reservar o mesmo horário ao mesmo tempo.
- Sem conta, o cliente é identificado pelo **telefone** (só dígitos): o mesmo telefone reaproveita o cadastro.
- Quem **tem conta** nunca é misturado com agendamentos sem conta, mesmo com o mesmo telefone (o cadastro não é verificado por SMS/e-mail ainda; ver decisões em aberto).
- Token de cliente não abre o painel e vice-versa (campo `tipo` no JWT).
- O preço é gravado em `preco_cobrado` no momento do agendamento (histórico não muda se o preço mudar).
- Status: `PENDENTE → CONFIRMADO → CONCLUIDO`, ou `CANCELADO` (libera o horário).

### Modelo de dados
Diagramas (MER e fluxos) em [`docs/MODELAGEM.md`](docs/MODELAGEM.md). Tabelas: `profissional`, `usuario`, `categoria_servico`, `servico`, `horario_disponivel`, `bloqueio_agenda`, `cliente`, `agendamento`.

## 6. API

Base: `/api`. Detalhes e exemplos em [`backend/README.md`](backend/README.md).

| Método e rota | Acesso | O que faz |
|---|---|---|
| `GET /saude` | público | API e banco no ar |
| `GET /servicos` | público | serviços ativos |
| `GET /disponibilidade?servico=&data=` | público | horários livres |
| `POST /agendamentos` | público | cria agendamento (409 se ocupado) |
| `POST /agendamentos/:id/cancelar` | público | cliente cancela (nº + telefone) |
| `POST /auth/login` | público | devolve token JWT |
| `POST /clientes/cadastro` | público | cria conta de cliente e já devolve o token |
| `GET /cliente/perfil`, `GET /cliente/agendamentos`, `POST /cliente/agendamentos/:id/cancelar` | cliente | área “Minha conta” |
| `GET /admin/agenda?inicio=&fim=` | profissional | agenda do período |
| `PATCH /admin/agendamentos/:id` | profissional | confirmar, concluir ou cancelar |
| `GET /admin/resumo` | profissional | dados do dashboard |
| `GET/POST /admin/servicos`, `PUT/DELETE /admin/servicos/:id` | profissional | serviços (inclui inativos). Com agendamentos, só desativa (409 ao excluir) |
| `GET/POST /admin/categorias`, `PUT/DELETE /admin/categorias/:id` | profissional | categorias (nome único) |
| `GET/POST /admin/horarios`, `DELETE /admin/horarios/:id` | profissional | janelas de atendimento (`dia_semana` 0=domingo…6=sábado); recusa sobreposição |
| `GET/POST /admin/bloqueios`, `DELETE /admin/bloqueios/:id` | profissional | folgas/feriados; o POST informa `agendamentos_afetados` |

## 7. Testes
```bash
cd backend  && npm test    # horários livres + API pública e do painel (33 testes)
cd frontend && npm test    # fluxo do cliente e do painel ligados à API (14 testes)
```
Os testes não precisam de MySQL (usam o repositório em memória). A ligação com o MySQL real ainda precisa ser validada (ver seção 1).

`cd backend && npm run verificar` roda o roteiro de ponta a ponta **contra o MySQL real** (ver seção 4.2); `npm run verificar:demo` faz o mesmo em memória.

## 8. Como trabalhamos (Git)
- **Nunca** commitar o arquivo `.env`.
- Antes de começar: `git pull`. Trabalhe em uma branch própria (`feature/nome-da-tarefa`) e abra *Pull Request* para revisão.
- Mensagens de commit claras, em português: `Adiciona cadastro de serviços no painel`.
- Alterou o banco? Atualize `database/mysql/` **e** o `docs/MODELAGEM.md`, e avise o grupo.
- Antes do PR: `npm test` no `backend/` e no `frontend/`.

## 9. Segurança
- O repositório é **público**: senhas, tokens e a `DATABASE_URL` nunca entram no Git.
- Senha do painel com bcrypt; sessão por JWT (8 h); limite de tentativas de login.
- `admin123` e o `03_dev_admin.sql` são **só para desenvolvimento**. Em produção, defina senha forte própria.
- Consultas SQL sempre parametrizadas.

## 10. Cronograma e próximos passos

Conforme o Plano de Ação.

| Quinzena | Período | Foco | Situação |
|---|---|---|---|
| 3 | 07/09–20/09 | Modelagem do banco e fluxos | ✅ |
| 4 | 21/09–30/09 | Estrutura inicial, API, protótipo React, **Relatório Parcial** | ✅ |
| 5 | 05/10–18/10 | Serviços, disponibilidade/conflitos, integração, acessibilidade e responsividade, testes | 🔄 em andamento |
| 6 | 19/10–01/11 | Testes funcionais e de integração, acessibilidade, validação com a profissional | — |
| 7 | 02/11–06/11 | Vídeo e **Relatório Final** (entrega 06/11) | — |

**Checklist da Quinzena 5**
- [ ] Validar a API com o MySQL real (seção 4.2) e corrigir o que aparecer
- [x] Painel: CRUD de serviços e categorias
- [x] Painel: horários de atendimento e folgas
- [ ] Trocar os dados fictícios pelos serviços, preços e horários reais da profissional
- [ ] Acessibilidade: testar com teclado, leitor de tela e celular
- [ ] Publicar na nuvem (API + MySQL + site)
- [ ] Refazer o DER no Workbench após o `02_melhorias.sql`

## 11. Decisões em aberto
- [ ] **Verificação da conta de cliente** (e-mail/SMS) e “esqueci a senha” — hoje a conta não é verificada
- [ ] Nome, logo, cores, fotos e contatos reais do salão → `frontend/src/marca.js`
- [ ] O agendamento nasce `CONFIRMADO` ou `PENDENTE` (a profissional aprova)? → `STATUS_INICIAL` no `.env`
- [ ] Prazo mínimo para o cliente cancelar?
- [ ] Passo dos horários (30 min?) e antecedência mínima → `PASSO_MINUTOS` e `ANTECEDENCIA_MINUTOS`
- [ ] **Pagamentos:** o relatório cita pagamentos, mas o sistema ainda não os controla — implementar ou retirar do texto?
- [ ] **Banco:** o Plano de Ação cita PostgreSQL e o grupo seguiu com MySQL — registrar o motivo no Relatório Final

## 12. Documentação
- [`docs/MODELAGEM.md`](docs/MODELAGEM.md) — modelo de dados, fluxos e telas
- [`docs/PASSO_A_PASSO_FINAL.md`](docs/PASSO_A_PASSO_FINAL.md) — sistema real (MySQL), instalar no Android e gravar o vídeo
- [`docs/MOBILE.md`](docs/MOBILE.md) — app no celular (PWA agora; Android e iPhone nativos depois)
- [`docs/PROXIMAS_ETAPAS.md`](docs/PROXIMAS_ETAPAS.md) — roteiro de testes no MySQL, etapas até 06/11 e instruções para o grupo
- [`docs/REVISAO_RELATORIO_PARCIAL.md`](docs/REVISAO_RELATORIO_PARCIAL.md) — o que ajustar no relatório
- [`database/mysql/README.md`](database/mysql/README.md) — montar o banco
- [`backend/README.md`](backend/README.md) — API em detalhe

---
*Este README é atualizado a cada etapa. Marque os itens concluídos nas listas acima.*

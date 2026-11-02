# Rascunho do Relatório Final (para a Samara montar no Word/Docs)

> **Como usar:** copie cada seção para o modelo de relatório da UNIVESP (ABNT, mesmo padrão do Parcial).
> O texto está pronto para revisão, mas **só o grupo pode confirmar** o que está marcado com **[PREENCHER]** ou **[CONFIRMAR]**.
> Tudo o que está aqui foi tirado do que existe no repositório e do resultado do `npm run verificar` (22 OK em 02/11/2026; os passos de remarcar, clientes e relatórios foram acrescentados depois: **rodar de novo e atualizar os números**).
> Entrega: **06/11/2026** (Samara, pelo AVA).
>
> ### Antes de entregar (checklist)
> - [ ] Refazer o **DER** (9 tabelas) no DBeaver/Workbench e trocar a Figura 1 do Parcial.
> - [ ] Tirar os prints listados na seção 2.5.8 (telas, `resultado-verificacao.txt`, trigger no DBeaver).
> - [ ] Corrigir o texto dos testes do Parcial (lista em `docs/REVISAO_RELATORIO_PARCIAL.md`, seção 2.4) e refazer o Teste 3 com print.
> - [ ] Decidir o que fazer com o "80% dos conflitos" (seção 2.5.1 do Parcial): citar a fonte ou reescrever sem número.
> - [ ] Decidir se mantém "pagamentos" no objetivo (o sistema só guarda o valor cobrado; ver 2.1).
> - [ ] Padronizar legendas ("Figura N" + "Fonte:") e cortar dos prints os comentários do SQL ("vai dar ERRO de propósito").
> - [ ] Conferir todos os links das referências e as datas de acesso.
> - [ ] Dados da profissional/salão: só incluir o que ela autorizou (nome, fotos, telefone).

---

## Capa e folha de rosto
Igual ao Parcial (UNIVESP; integrantes: Amanda Rodrigues Pinheiro, Edinaldo Cruz da Silva, Lucas Barcello Daloco,
Marcela Natália Liberato Giacometti, Mayer Marinho Leandro, Nicolas Caliel Picussa, Samara da Silva Nascimento;
Tutor: Jefika Bezerra; Polo de Guararapes, Araçatuba e Ilha Solteira; 2026). Atualizar o número de folhas.

## RESUMO

O presente trabalho aborda o desenvolvimento de um sistema web para gestão de serviços e agendamentos, tendo como
contexto uma profissional autônoma da área da beleza que controlava os horários de forma manual, por caderno e
mensagens de WhatsApp. O objetivo foi desenvolver uma agenda eletrônica acessível por computador e celular, na qual a
profissional cadastra serviços, preços e horários de atendimento e os clientes consultam os serviços e fazem o próprio
agendamento, sem conflitos de horário. A metodologia adotada foi o Design Thinking, nas etapas Ouvir e interpretar,
Criar e Prototipar e Implementar e Testar. O sistema foi construído com React (interface), Node.js com Express (API) e
banco de dados relacional MySQL, com controle de versão em Git/GitHub. O cálculo dos horários livres é feito na API a
partir da grade semanal, das folgas e dos agendamentos existentes, e a regra de não sobreposição é garantida em dois
níveis: trava transacional na API e *trigger* no banco. Os testes automatizados (46 de API e 21 de interface) e a
verificação ponta a ponta contra um MySQL real (22 verificações, incluindo 6 requisições simultâneas ao mesmo horário)
foram bem-sucedidos. Conclui-se que o sistema atende ao escopo definido no Plano de Ação e constitui uma base
funcional para uso pela profissional; ficam como limitações a ausência de validação da interface com a profissional e
com clientes, de publicação em nuvem e de pagamento online.

**PALAVRAS-CHAVE:** Sistema web; Gestão de serviços; Agendamento; Banco de dados; Design Thinking.

## SUMÁRIO (sugestão)
```
1 INTRODUÇÃO
2 DESENVOLVIMENTO
  2.1 OBJETIVOS (2.1.1 Objetivos específicos)
  2.2 JUSTIFICATIVA E DELIMITAÇÃO DO PROBLEMA
  2.3 FUNDAMENTAÇÃO TEÓRICA
  2.4 METODOLOGIA
  2.5 RESULTADOS E DISCUSSÃO
3 CONSIDERAÇÕES FINAIS
REFERÊNCIAS
APÊNDICES (A: roteiro de testes e resultado da verificação; B: endpoints da API)
```

---

## 1 INTRODUÇÃO

*(Aproveite os 4 parágrafos do Parcial e acrescente o parágrafo abaixo no fim.)*

Na segunda etapa do Projeto Integrador, a proposta evoluiu do banco de dados para um sistema web completo. O sistema
é composto por uma interface em React, uma API em Node.js/Express e o banco de dados relacional MySQL modelado no
Relatório Parcial. O cliente escolhe um serviço, vê os horários realmente livres e confirma o agendamento pelo
computador ou pelo celular, com ou sem conta; a profissional acompanha a agenda e administra serviços, horários e
folgas em um painel protegido por login. Este relatório descreve o processo, as decisões técnicas, os testes realizados
e as limitações encontradas.

---

## 2 DESENVOLVIMENTO

### 2.1 OBJETIVOS
Objetivo geral: igual ao Parcial. **[DECIDIR]** O Parcial fala em "clientes, serviços, horários **e pagamentos**". O
sistema registra o **valor cobrado** em cada agendamento (`preco_cobrado`), mas **não** controla pagamento (forma,
pago/pendente). Sugestão de redação: *"...gerenciamento de clientes, serviços, horários e valores dos atendimentos..."*
e citar o controle de pagamentos como trabalho futuro.

Objetivos específicos: manter os do Parcial e acrescentar:
- Implementar uma API que calcule os horários disponíveis e impeça conflitos de agendamento, inclusive em acessos simultâneos;
- Desenvolver uma interface web responsiva para o cliente e um painel administrativo para a profissional;
- Verificar o funcionamento integrado de interface, API e banco de dados por meio de testes automatizados e de uma verificação ponta a ponta.

### 2.2 JUSTIFICATIVA E DELIMITAÇÃO DO PROBLEMA
Manter o texto do Parcial. Acrescentar a delimitação do que foi entregue:

**Escopo entregue:** cadastro de serviços e categorias; dias e horários de atendimento; folgas e feriados; consulta de
serviços e horários livres; agendamento pelo cliente (com ou sem conta); cancelamento e **remarcação** pelo cliente (conta) e pela profissional (com aviso por link do WhatsApp); agenda da
profissional com confirmação, conclusão e cancelamento; painel com resumo, **clientes** (busca e histórico) e **relatórios** (período, faturamento realizado e previsto, cancelamentos, por serviço; exporta CSV); uso em computador e celular (incluindo
instalação como aplicativo, PWA).

**Fora do escopo desta entrega:** pagamento online; envio automático de lembretes; observações por cliente; publicação do sistema em servidor na internet.

### 2.3 FUNDAMENTAÇÃO TEÓRICA
Manter 2.3.1 a 2.3.3 do Parcial e acrescentar (cada fonte deve ser **conferida antes de citar**, ver Referências):

- **2.3.4 Arquitetura em camadas e API REST.** Explicar a separação entre interface, API e banco, e o uso de HTTP/JSON (FIELDING, 2000; documentação do Express). Ligar com o que o sistema faz: a interface nunca acessa o banco, só a API.
- **2.3.5 Bancos relacionais, transações e concorrência.** Integridade referencial, *triggers*, transações e travas de linha (`SELECT ... FOR UPDATE`) (documentação do MySQL). É a base da seção 2.5.4.
- **2.3.6 Acessibilidade e usabilidade na web.** Diretrizes WCAG (W3C): HTML semântico, rótulos, foco, contraste, navegação por teclado.
- **2.3.7 Proteção de dados pessoais.** LGPD (Lei nº 13.709/2018): o sistema coleta nome, telefone e e-mail; senhas são guardadas com *hash* (bcrypt).

### 2.4 METODOLOGIA
Design Thinking em três etapas (como no Parcial). Acrescentar o que mudou:

**2.4.1 Ouvir e interpretar o contexto.** Texto do Parcial, com os ajustes de `docs/REVISAO_RELATORIO_PARCIAL.md`
(2.10): dizer que a observação e a entrevista foram feitas com a **profissional**; atribuir "perda de clientes" à fala dela.

**2.4.2 Criar/Prototipar.** Banco modelado no Parcial (MySQL Workbench 8.0.36) e evoluído com scripts versionados. O
banco passou de 7 para **9 tabelas**: `bloqueio_agenda` (folgas e feriados) e `conta_cliente` (conta opcional do cliente).
O storyboard e o protótipo da interface seguiram o fluxo: **home com serviços → escolher serviço → identificar-se ou
continuar sem conta → escolher data e horário → confirmação**. **[PREENCHER]** se houve protótipo em papel/Figma.

**2.4.3 Implementar/Testar.** Desenvolvimento em ciclos curtos e entregas por etapas (painel da profissional, depois
conta do cliente, depois visual), com versionamento em Git (GitHub) e testes automatizados a cada etapa.

**Tecnologias** (relacionadas ao tema norteador do Plano de Ação):

| Item do tema norteador | Como foi atendido |
|---|---|
| JavaScript | React 18 (interface) e Node.js (API) |
| API | Express 4 com rotas públicas, de cliente e de administração; validação de entrada |
| Banco de dados | MySQL 8, 9 tabelas, *triggers*, restrições `CHECK` |
| Controle de versão | Git e GitHub (repositório público do grupo) |
| Testes | Testes automatizados (Node test runner e Vitest) e verificação ponta a ponta |
| Acessibilidade | HTML semântico, rótulos, foco visível, `aria-live`, contraste; **sem auditoria formal** |
| Computação em nuvem | **Não publicado**: o sistema rodou localmente; para teste no celular foi usado um túnel HTTPS temporário |

**Banco: MySQL no lugar de PostgreSQL. [CONFIRMAR com o grupo e avisar a tutora]** O Plano de Ação previa
PostgreSQL. O grupo manteve o **MySQL**, já usado e testado no Relatório Parcial (modelo, scripts e *triggers* prontos),
evitando refazer a modelagem e os testes em prazo curto. A API isola o acesso ao banco em uma única camada
(`repos/mysql.js`), o que facilita uma migração futura.

### 2.5 RESULTADOS E DISCUSSÃO

#### 2.5.1 Resultados da etapa Ouvir e interpretar
Texto do Parcial. **Corrigir** a frase "80% dos conflitos...": ou informar a fonte ("segundo relato da profissional...")
ou reescrever sem número ("a maior parte dos conflitos relatados decorria da falta de um controle centralizado").
Incluir o storyboard (Figura) ou retirar a menção.

#### 2.5.2 Arquitetura da solução
Três camadas:

```
 Cliente (celular/computador)          Profissional (painel)
        |                                      |
        v                                      v
   Interface React (Vite)  ── HTTP/JSON ──>  API Node.js + Express  ──>  MySQL (9 tabelas, triggers)
```

- **Interface (`frontend/`)**: 7 páginas públicas e de conta (home, identificar, agendar, cancelar, entrar, cadastro, minha conta) e 4 telas do painel (resumo, agenda, serviços, horários).
- **API (`backend/`)**: rotas públicas (serviços, horários livres, agendar, cancelar), de cliente (perfil, histórico, cancelar) e de administração (agenda, CRUD de serviços/categorias/horários/folgas, resumo).
- **Banco (`database/mysql/`)**: scripts `01` a `04`, executados em ordem. **Figura:** DER atualizado (9 tabelas).

Segurança: senhas com *hash* bcrypt; sessão por token JWT (profissional 8 h, cliente 7 dias) com separação de perfis (um
token de cliente não abre rotas do painel); limite de tentativas de login (20 a cada 15 min); cabeçalhos de segurança
(Helmet); CORS restrito; consultas SQL parametrizadas; credenciais só em arquivo `.env` fora do Git.

#### 2.5.3 Regras de negócio implementadas
- **Horários livres** = grade semanal da profissional − folgas/feriados − agendamentos não cancelados; nunca no passado; com antecedência mínima (60 min) quando for hoje; passo de 30 min **[CONFIRMAR com a profissional]**.
- O horário oferecido considera a **duração do serviço** (ex.: coloração de 2 h bloqueia 4 intervalos de 30 min).
- Cliente identificado pelo **telefone** (só dígitos); a conta é **opcional**; quem tem conta não se mistura com agendamentos sem conta.
- Agendamento nasce **CONFIRMADO** **[CONFIRMAR com a profissional]**; cancelamento pelo cliente exige o telefone cadastrado; histórico nunca é apagado (serviço com agendamentos só é desativado).
- Preço histórico: o valor cobrado fica gravado no agendamento, mesmo que o preço do serviço mude depois.

#### 2.5.4 Prevenção de conflitos e concorrência (principal aprendizado técnico)
O Parcial apresentava o *trigger* como garantia total. Na integração, constatou-se um limite: o *trigger* consulta e
depois grava, então **duas reservas simultâneas poderiam passar juntas**. A solução foi usar **duas camadas**:
1. **API:** cada reserva roda em uma transação (`READ COMMITTED`) que primeiro **trava a linha da profissional** (`SELECT ... FOR UPDATE`), refaz o cálculo de disponibilidade e só então grava;
2. **Banco:** o *trigger* continua como última barreira (erro 1644), mesmo para quem inserir direto no banco.

Evidência: no teste de concorrência, **6 pedidos simultâneos para o mesmo horário resultaram em exatamente 1 agendamento**
(os demais receberam HTTP 409), e a inserção direta de um horário sobreposto no banco foi bloqueada (erro 1644).

#### 2.5.5 Interface e responsividade
Interface com fluxo curto de agendamento em 3 passos, layout fluido (a partir de 360 px), botões grandes para toque,
mensagens de erro claras e painel utilizável em tablet e celular. O sistema pode ser **instalado como aplicativo**
(PWA) no celular, com ícone e abertura em tela cheia. **[PREENCHER]** se testaram em celulares reais (modelo/navegador).
Identidade visual: nome fictício **"Studio Aurora"**, logo e paleta definidos pelo grupo; serviços e imagens ilustrativos
**[CONFIRMAR]** (fotos geradas por IA, não reais).

#### 2.5.6 Acessibilidade
Foram aplicadas boas práticas: HTML semântico, rótulos em todos os campos, foco visível e navegação por teclado,
mensagens anunciadas por `aria-live` e contraste de cores. **Não foi realizada auditoria formal**
(ex.: leitor de tela e ferramenta automática) nem teste com usuários; registrar como limitação.

#### 2.5.7 Testes e resultados

| Teste | O que cobre | Resultado |
|---|---|---|
| Automatizados da API (46) | cálculo de horários, agendar, conflito, cancelar, remarcar, painel, clientes, relatórios, conta de cliente, permissões | 46 de 46 passaram |
| Automatizados da interface (21) | fluxo do cliente, conta, remarcar, painel, clientes, relatórios, instalação do PWA | 21 de 21 passaram |
| Verificação ponta a ponta no **MySQL real** (22 passos) | login, CRUD de serviço e horário, agendamento, conflito 409, concorrência (6 simultâneos), *trigger*, cancelamento, folga, conta de cliente | **22 de 22 OK** em 02/11/2026 (roteiro anterior à remarcação, clientes e relatórios; o script atual tem 27 passos: **[PREENCHER o novo resultado]**) **[PREENCHER versão do MySQL, que consta no `resultado-verificacao.txt`]** |
| *Triggers* no DBeaver/Workbench (`database/mysql/testes/teste_trigger.sql`) | inserção válida, sobreposta, encostada e `UPDATE` em conflito | **[PREENCHER com prints]** |

Observação: a verificação deixou de fora o resumo do painel (`/admin`) e o CRUD de categorias, conferidos
manualmente nas telas **[PREENCHER após conferir]**. Também houve uma falha inicial (18 de 22) causada apenas pela
senha de teste diferente da senha do painel; o script foi corrigido para ler a senha do `.env` e parar logo se o login
falhar. Este é um bom exemplo de como a verificação automatizada ajudou a achar problemas de configuração.

#### 2.5.8 Figuras e prints sugeridos
1. DER atualizado (9 tabelas) · 2. Arquitetura em 3 camadas · 3. Home com serviços · 4. Escolha de data/horário ·
5. Confirmação do agendamento · 6. Mesmo horário indisponível · 7. Agenda da profissional · 8. Serviços e horários
no painel · 9. App instalado no celular · 10. `resultado-verificacao.txt` (22 OK) · 11. Trigger bloqueando (erro 1644) ·
12. `SELECT * FROM agendamento` mostrando o agendamento criado pelo site.

#### 2.5.9 Discussão
- O banco do Parcial foi a base correta: a regra de conflito já existia e foi mantida como barreira final.
- A parte mais complexa foi o **cálculo de horários** (duração do serviço, folgas, antecedência), que não cabe no banco e ficou na API.
- A **concorrência** só apareceu na integração: o teste local com um usuário não revelaria o problema.
- A conta de cliente opcional reduz atrito (agendar sem cadastro), mas, sem verificação de e-mail/telefone, não se pode confiar na identidade do cliente. Decisão registrada como limitação.

---

## 3 CONSIDERAÇÕES FINAIS

**Resultados.** Foi entregue um sistema web funcional, que permite à profissional organizar serviços, preços,
horários e folgas e aos clientes agendar sozinhos, com prevenção de conflitos comprovada por testes automatizados e por
verificação em MySQL real. O sistema funciona em computador e celular.

**Limitações.**
- A interface **não foi validada com a profissional nem com clientes**; o feedback do Parcial refere-se ao diagrama do banco.
- Não houve auditoria formal de acessibilidade.
- O sistema **não foi publicado em nuvem** (execução local; túnel temporário para teste no celular).
- Dados de serviços, preços e horários são **fictícios**; falta cadastrar os reais.
- Sem verificação de e-mail/telefone, sem recuperação de senha e sem aviso de privacidade (LGPD) na interface.
- Pagamento online, lembretes automáticos (hoje só há o botão de WhatsApp que abre a conversa) e observações por cliente ficaram para o futuro. O faturamento dos relatórios é estimado a partir do valor cobrado de cada agendamento (não há controle de pagamento).
- Dependência do frontend com vulnerabilidades moderadas conhecidas (`react-router-dom`); atualização exige mudança de versão maior.

**Trabalhos futuros.** Validação com a profissional e clientes; publicação em nuvem com HTTPS; lembretes automáticos;
pagamento online; observações por cliente; verificação de e-mail e recuperação de senha;
adaptação para outros profissionais com horário marcado (barbeiros, manicures, esteticistas).

**Aprendizados do grupo.** **[PREENCHER, 1 parágrafo]**: trabalho em equipe a distância, uso de Git, integração
entre camadas, testes.

---

## REFERÊNCIAS
Manter as 6 do Parcial (corrigir a formatação de Vanni, 2005 e conferir a edição da NBR 14724). Novas, **a conferir o
link e a data de acesso antes de usar** (formato ABNT: "Acesso em: dd mmm. 2026"):

- FIELDING, R. T. *Architectural Styles and the Design of Network-based Software Architectures*. Tese (Doutorado), University of California, Irvine, 2000.
- W3C. *Web Content Accessibility Guidelines (WCAG) 2.2*. Disponível em: https://www.w3.org/TR/WCAG22/.
- BRASIL. *Lei nº 13.709, de 14 de agosto de 2018* (Lei Geral de Proteção de Dados Pessoais).
- ORACLE. *MySQL 8.0 Reference Manual* (triggers, transações e `SELECT ... FOR UPDATE`). Disponível em: https://dev.mysql.com/doc/refman/8.0/en/.
- META. *React Documentation*. Disponível em: https://react.dev/.
- OPENJS FOUNDATION. *Express: Node.js web application framework*. Disponível em: https://expressjs.com/.

## APÊNDICES (sugestão)
- **A:** conteúdo de `backend/resultado-verificacao.txt` (22 passos) e roteiro de testes manuais (`docs/PROXIMAS_ETAPAS.md`, seção 3.3).
- **B:** tabela de endpoints da API (`README.md`, seção "API").
- **C:** link do repositório (https://github.com/Random01-01/BD2) e do vídeo **[PREENCHER]**.

# Roteiro do vídeo (pronto para gravar)

> Duração-alvo: **6 min 30 s** (confirme o limite do AVA). Roteiro: Amanda e Marcela. Gravação e revisão: todos.
> Preparação, ferramentas (OBS, gravação de tela do celular, Clipchamp) e envio estão em
> `docs/PASSO_A_PASSO_FINAL.md`, Parte 9. Aqui está **o que falar e o que mostrar, cena a cena**.
>
> Os trechos entre `[colchetes]` são ações na tela. O texto em citação é a fala (≈ 140 palavras por minuto).
> A divisão de quem fala é uma sugestão: ajustem. **[PREENCHER]** = dado que só o grupo tem.

## Antes de gravar (10 itens, 15 min)
1. Banco limpo: rode `01` a `04` de novo no DBeaver (apaga os dados `[TESTE]`) e a senha do painel de novo.
2. Cadastre **3 ou 4 serviços reais** e os horários da semana pelo painel (assim a gravação também mostra o cadastro).
3. Dados do salão em `frontend\src\marca.js` (endereço, telefone, Instagram) e `npm run build`; suba com `iniciar.bat`.
4. Abra: navegador com **zoom 110–125%**; **DBeaver** com `SELECT * FROM agendamento ORDER BY id_agendamento DESC;`; terminal na pasta `backend` com o resultado do `npm run verificar` na tela.
5. Celular: bateria > 50%, notificações desligadas, app já instalado (ou o túnel pronto).
6. Senhas e `.env` **nunca na tela** (campo de senha oculto; não abra o `.env`).
7. Escolha uma **data futura** (dia útil) e o horário que vai usar, e anote.
8. Faça um ensaio completo de ponta a ponta sem gravar; depois limpe o agendamento do ensaio (cancele no painel).
9. Grave **uma cena por vez**, em arquivos separados (`01-abertura.mp4`, `02-problema.mp4`...).
10. Teste o microfone por 10 s.

---

## Cena 1 · Abertura (0:00–0:30) · Amanda
**Tela:** slide simples ou a home do sistema, com o título do trabalho.

> "Olá! Somos o Grupo 4 do Projeto Integrador em Computação da Univesp, do polo de Guararapes. Eu sou [NOME]
> e, junto com [NOMES], apresento o nosso trabalho: Sistema Web para Gestão de Serviços e Agendamentos, uma solução
> tecnológica para profissionais autônomos."

## Cena 2 · O problema (0:30–1:15) · Marcela
**Tela:** slide com o fluxo antigo (cliente manda WhatsApp → profissional olha o caderno → anota o horário). Pode ser o storyboard.

> "Nosso cenário é uma cabeleireira autônoma. Hoje ela organiza os atendimentos pelo caderno e por mensagens de
> WhatsApp. O cliente pergunta se há horário, ela confere o caderno, responde e anota. Esse processo toma tempo, e
> depende de uma conversa para cada marcação. Também abre espaço para o erro mais temido de quem trabalha com hora
> marcada: dois clientes no mesmo horário. A pergunta que guiou o projeto foi: como uma aplicação web pode ajudar
> uma profissional autônoma a organizar seus horários e permitir que o cliente agende sozinho, de forma simples?"

## Cena 3 · A solução e as tecnologias (1:15–1:45) · Edinaldo
**Tela:** slide com 3 blocos: React → Node/Express → MySQL (e ícones de computador e celular).

> "A solução é um sistema web que funciona no computador e no celular. A interface foi feita em React. Uma API em
> Node.js com Express aplica as regras de negócio, e os dados ficam em um banco MySQL, modelado na etapa anterior.
> Usamos Git e GitHub para o controle de versão e testes automatizados em todas as camadas."

## Cena 4 · Demonstração no computador (1:45–4:00) · Lucas (cliente) e Mayer (painel)

**Parte A, o cliente (≈ 1 min 15 s).**
[Home → role até os serviços → clique em **Agendar** em um serviço → tela "Como você prefere continuar?" → **Continuar sem conta** → escolha o dia e um horário → **Continuar** → preencha nome, telefone e e-mail → **Confirmar**.]

> "Esta é a página do salão. O cliente vê os serviços, os preços e a duração, e escolhe o que deseja. Ele pode
> entrar na conta, criar uma ou continuar sem conta; aqui vamos sem. O sistema mostra só os horários realmente livres,
> já considerando a duração do serviço, as folgas e os outros agendamentos. O cliente escolhe o horário, informa os
> dados e confirma. Pronto: agendamento confirmado, com um número para consulta."

**Parte B, a prevenção de conflitos (≈ 30 s).**
[Refaça o agendamento do mesmo serviço e dia: o horário que acabou de ser usado **não aparece mais**.]

> "Se outra pessoa tentar o mesmo dia, aquele horário já não está disponível. E mesmo que dois clientes confirmem ao
> mesmo tempo, apenas um consegue: o sistema trava a reserva e o próprio banco tem uma regra que bloqueia
> agendamentos sobrepostos."

**Parte C, o painel (≈ 1 min).**
[Entre em `/entrar` com o login da profissional (senha oculta) → **Resumo** → **Agenda** (aparece o agendamento) → **Remarcar** (novo horário e o botão de avisar pelo WhatsApp) → **Confirmar/Concluir** → **Clientes** (busque e abra o histórico) → **Relatórios** (mês atual) → **Serviços** (edite um preço) → **Horários e folgas** (crie uma folga no dia).]

> "Agora, a visão da profissional. Depois do login, ela vê o resumo do dia e a agenda com o agendamento que acabou de
> chegar. Pode confirmar, concluir ou cancelar. Em Serviços, ela cadastra e edita nomes, preços e durações. Em Horários,
> define os dias e horas de atendimento e marca folgas e feriados. Quando ela cria uma folga, esse dia deixa de
> aparecer para os clientes. Em Clientes, ela encontra cada pessoa e vê o histórico; em Relatórios, acompanha
> quantos atendimentos, quanto faturou e quais serviços mais saem."

**Parte D, remarcar pela conta do cliente (≈ 30 s, opcional; se o tempo apertar, corte a Parte C de Serviços).**
[Entre como cliente (conta criada antes) → **Minha conta** → **Remarcar** no agendamento → nova data e horário → **Confirmar nova data** → mensagem de sucesso.]

> "Quem tem conta também pode remarcar sozinho: escolhe outro dia e horário livre do mesmo serviço, e o sistema
> só aceita se não houver conflito."

## Cena 5 · No celular (4:00–5:00) · Nicolas
**Tela:** gravação de tela do celular. [Abra o endereço (túnel HTTPS) no Chrome → menu → **Instalar app / Adicionar à tela inicial** → abra pelo ícone → agende → mostre no PC o agendamento aparecendo na agenda.]

> "O sistema também é pensado para o celular. A tela se adapta, os botões são grandes e o site pode ser instalado como
> aplicativo, com ícone na tela inicial. Aqui, agendo pelo celular… e, no computador, o agendamento aparece na agenda
> da profissional."

*(Se a instalação não funcionar no dia, grave só o uso no navegador do celular e diga "acessado pelo navegador"; não
prometa o que não aparece.)*

## Cena 6 · Banco de dados e testes (5:00–5:45) · Samara
**Tela:** DBeaver com `SELECT * FROM agendamento` (a linha criada pelo site) → terminal com o fim do `npm run verificar`: `TUDO CERTO` (confira o número no seu resultado: o roteiro atual tem 27 verificações).

> "Aqui, no banco, está o agendamento que acabamos de criar pelo site. Para garantir a qualidade, temos 46 testes
> automatizados na API e 21 na interface. Além disso, rodamos uma verificação ponta a ponta contra o MySQL de verdade,
> com 27 passos: login, cadastro de serviços, agendamento, conflito de horário, cancelamento, conta de cliente, remarcar, clientes e relatórios.
> Inclusive, 6 pedidos simultâneos para o mesmo horário resultaram em exatamente um agendamento."

## Cena 7 · Resultados, limitações e próximos passos (5:45–6:30) · Amanda e Marcela
**Tela:** slide com 3 listas curtas: **Entregamos / Limitações / Próximos passos**.

> "Entregamos um sistema funcional: cadastro de serviços e horários, agendamento pelo cliente, agenda da
> profissional e prevenção de conflitos, no computador e no celular. Reconhecemos limitações: ainda não validamos a
> interface com a profissional e com clientes, o sistema roda localmente, sem publicação na nuvem, e não há pagamento
> online. Como próximos passos, propomos testes com a profissional, publicação com HTTPS, lembretes automáticos e
> relatórios. Agradecemos à profissional que nos recebeu, à nossa tutora, e a você que assistiu. Obrigado!"

---

## Checklist final do vídeo
- [ ] Duração dentro do limite do AVA; áudio claro; sem senha, `.env`, nem dados pessoais reais na tela.
- [ ] Todos os integrantes aparecem ou falam (ou citados no início, conforme exigência do AVA).
- [ ] Cena do conflito e cena do banco mostradas (são o diferencial técnico).
- [ ] Exportado em MP4 (720p ou 1080p) e testado em outro computador.
- [ ] Link (YouTube "não listado" ou Drive com permissão aberta) abrindo **sem login**; link colocado no relatório (Apêndice C) **[PREENCHER]**.
- [ ] Samara entrega no AVA até **06/11** (sugestão: até 05/11, para sobrar tempo).

## Se der problema na hora de gravar
| Problema | Plano B |
|---|---|
| Túnel/instalação do app no celular não funciona | Gravar o celular no Wi-Fi local (`http://192.168.x.x:5173`), sem instalar; avisar na fala |
| Banco/API com erro no meio | Gravar a cena de novo; para treinar, use `iniciar.bat demo` (dados prontos, não grava no banco) |
| Horário "já passou" ao ensaiar | O sistema não aceita passado nem antecedência menor que 60 min: escolha outro dia |
| Tempo estourou | Corte a Parte C (painel) para só Agenda + Horários e encurte a Cena 3 |

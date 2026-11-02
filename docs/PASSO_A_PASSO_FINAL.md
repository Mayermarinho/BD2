# Passo a passo: sistema real, Android e vídeo

> Para Windows (`cmd`). Nada aqui exige publicar na internet. Tempo total estimado: 3 a 5 horas
> (banco 40 min · testes 20 min · Android 20 min · gravação e edição 1 a 2 h).
> Os passos de **Android** e de **vídeo** não foram testados pelo agente (sem celular nem tela): se algo
> se comportar diferente, anote e avise.

## Parte 1. Antes de começar

Instalados no computador: **Git**, **Node.js LTS** (`node -v` deve mostrar 18.11 ou maior), **MySQL Server 8 + MySQL Workbench**.

Atualize o projeto (pasta do repositório, a que contém `backend` e `frontend`):

```
cd C:\Users\viros\OneDrive\Desktop\BD2\BD2
git pull
```

## Parte 2. Criar o banco real

1. Abra o **MySQL Workbench**, entre na conexão local (usuário `root`, com a senha definida na instalação).
2. **File > Open SQL Script** e execute com o raio ⚡, **um por vez e nesta ordem**, os arquivos de `database\mysql\`:
   1. `01_schema_original.sql` (**apaga e recria** o banco: rode uma vez só)
   2. `02_melhorias.sql` (**só uma vez**)
   3. `03_dev_admin.sql`
   4. `04_conta_cliente.sql`
3. Confira: `USE sistema_agendamento; SHOW TABLES;` deve listar as tabelas. Se algum script der erro em vermelho, **pare** e tire print.

### Alternativa: usar o DBeaver no lugar do Workbench

O sistema **não depende** do Workbench: a API só precisa do MySQL Server e da `DATABASE_URL`. O DBeaver é só outro programa para rodar os scripts e consultar o banco (o **MySQL Server continua sendo necessário**).

1. **Nova conexão:** botão de tomada com "+" (ou *Banco de Dados > Nova Conexão*) > **MySQL** > Avançar.
   - Host `localhost`, porta `3306`, usuário `root`, sua senha. **Deixe o campo "Database" vazio** (o script `01` cria o banco).
   - Na primeira vez, o DBeaver oferece **baixar o driver do MySQL**: aceite (precisa de internet).
   - Clique em **Testar Conexão** e depois em **Concluir**.
   - Se aparecer `Public Key Retrieval is not allowed`: *Editar Conexão > Driver properties* e defina `allowPublicKeyRetrieval` = `true` (e `useSSL` = `false`).
2. **Abrir o script:** *Arquivo > Abrir Arquivo...* e escolha `database\mysql\01_schema_original.sql`. Confira no topo do editor que a conexão ativa é a do MySQL.
3. **Executar o script inteiro: Alt + X** (*Executar Script*). **Não use Ctrl + Enter**, que roda só um comando.
4. Repita para `02`, `03` e `04`, **na mesma ordem** (o `01` e o `02` só uma vez).
5. Atualize a lista da esquerda com **F5** sobre a conexão: o banco `sistema_agendamento` aparece.
6. **Confira as triggers** (o `01` usa o comando `DELIMITER $$`, que o DBeaver costuma entender, mas não foi testado pelo agente):
   ```
   USE sistema_agendamento;
   SHOW TRIGGERS;
   ```
   Devem aparecer **2 linhas**: `trg_impede_conflito_horario` e `trg_impede_conflito_horario_update`.
   Se não aparecerem, selecione só o bloco do trigger (de `DELIMITER $$` até `DELIMITER ;`) e execute com Alt + X, ou rode o script pelo Workbench de outro integrante.
7. Para testar o conflito (Teste 2 do Parcial), execute um `INSERT` de agendamento em horário já ocupado: o DBeaver mostra o erro `SQL Error [1644] [45000]: ERRO: Conflito de horário!...`. Tire print.
8. **Diagrama (DER):** clique com o botão direito no banco `sistema_agendamento` > **Ver Diagrama** (*View Diagram*). Para salvar a imagem: botão direito no diagrama > *Save as image*. Se trocar a ferramenta, cite no relatório qual gerou o DER.

O resto do passo a passo não muda (`.env`, `npm run verificar`, `iniciar.bat`).

## Parte 3. Ligar o sistema ao banco (`.env`)

```
cd backend
copy .env.example .env
notepad .env
```

Preencha (e salve):

```
DATABASE_URL=mysql://root:SUA_SENHA@localhost:3306/sistema_agendamento
JWT_SECRET=cole-aqui-um-texto-aleatorio-de-32-ou-mais-caracteres
```

- Senha com `@`, `#` ou `/`: escreva codificada (`@` vira `%40`, `#` vira `%23`, `/` vira `%2F`).
- Para gerar o `JWT_SECRET`: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
- 🔒 O `.env` **nunca** vai ao GitHub e **nunca** aparece no vídeo.

## Parte 4. Verificar tudo no banco real

Na pasta `backend`, com a API **parada**:

```
npm install
npm run verificar
```

Deve terminar com `TUDO CERTO`. O arquivo `backend\resultado-verificacao.txt` é a evidência para o relatório (mande ao grupo).
Se aparecer `FALHOU`, mande o arquivo e o texto do terminal.

## Parte 5. Deixar o sistema pronto para uso real

1. **Trocar a senha do painel** (a `admin123` é pública). Na pasta `backend`:
   ```
   node -e "console.log(require('bcryptjs').hashSync('SUA_SENHA_FORTE',10))"
   ```
   Copie o texto que começa com `$2b$10$`. No Workbench:
   ```
   USE sistema_agendamento;
   UPDATE usuario SET senha_hash = 'COLE_O_HASH_AQUI' WHERE email = 'admin@mariana.com';
   ```
2. **Limpar os dados de teste** (opcional, recomendado antes do vídeo): rode de novo `01`, `02`, `03` e `04` (nessa ordem) e troque a senha outra vez.
3. **Dados do salão:** edite `frontend\src\marca.js` (nome, telefone, endereço, horários, Instagram). Se mudar o nome, ajuste também `frontend\public\manifest.webmanifest`.
4. **Serviços reais:** entre no painel (`/entrar`) e cadastre serviços, preços, horários de atendimento e folgas da profissional (ou faça isso junto com ela).

## Parte 6. Ligar o sistema

**Jeito fácil:** dê dois cliques em **`iniciar.bat`** (na raiz do projeto). Ele abre duas janelas: a **API** (MySQL) e o **site** (versão compilada). Para treinar sem banco: `iniciar.bat demo` no `cmd`.

**Jeito manual** (dois terminais):

```
cd C:\Users\viros\OneDrive\Desktop\BD2\BD2\backend
npm install
npm start
```
```
cd C:\Users\viros\OneDrive\Desktop\BD2\BD2\frontend
npm install
npm run build
npm run preview
```

Abra `http://localhost:5173` e aperte **Ctrl + F5**. Confira `http://localhost:3001/api/saude` (deve mostrar `{"ok":true}`).
Se o site mostrar "Servidor indisponível" ou a janela do site mostrar `ECONNREFUSED`, a API não está rodando.

## Parte 7. Acessar pelo celular

1. Celular e computador **no mesmo Wi-Fi**.
2. No computador: `ipconfig`, e anote o **Endereço IPv4** (ex.: `192.168.0.172`). A janela do site também mostra o endereço `Network`.
3. No Windows, a rede do Wi-Fi deve estar como **Privada** (Configurações > Rede e Internet > Wi-Fi > propriedades). Se o celular não abrir a página, aceite a permissão do **Node.js** no Firewall, ou, em um `cmd` **como administrador**:
   ```
   netsh advfirewall firewall add rule name="Aurora 5173" dir=in action=allow protocol=TCP localport=5173 profile=private
   ```
4. No celular, abra `http://SEU-IP:5173`.

## Parte 8. Instalar no Android

**A) Atalho na tela inicial (mais simples, só Wi-Fi):** no **Chrome** do celular, abra `http://SEU-IP:5173`, toque em **⋮ > Adicionar à tela inicial**. Vira um ícone, mas abre como página do navegador.

**B) App completo com HTTPS (recomendado para o vídeo):** com o site no ar (Parte 6), abra um túnel em outro terminal:
```
winget install Cloudflare.cloudflared
cloudflared tunnel --url http://localhost:5173
```
(ou `ngrok http 5173`, que exige conta gratuita). O terminal mostra um endereço `https://...`. Abra-o no **Chrome do celular**, espere alguns segundos e toque em **"📲 Instalar o app no celular"** no rodapé (ou ⋮ > **Instalar app**). O ícone da tesoura aparece na tela inicial e o app abre em tela cheia.
⚠️ Com o túnel aberto, qualquer pessoa com o link acessa o sistema: **use banco de teste** e feche o túnel (Ctrl + C) ao terminar.

**C) Alternativa sem túnel:** no Chrome do celular, `chrome://flags/#unsafely-treat-insecure-origin-as-secure`, ative, digite `http://SEU-IP:5173`, toque em **Relaunch** e instale pelo menu ⋮. (Opção de desenvolvimento; pode variar conforme a versão.)

**iPhone:** Safari, Compartilhar > Adicionar à Tela de Início (o iPhone também exige HTTPS para o app completo).

## Parte 9. Gravar o vídeo

**Preparação (15 min):**
- Banco limpo (Parte 5, item 2), com 3 a 4 serviços cadastrados e horários de atendimento na semana.
- Feche abas e programas, desligue notificações (computador e celular), deixe a bateria do celular acima de 50%.
- Navegador com **zoom 110% a 125%**, janela maximizada. **Não mostre** o `.env`, a senha do MySQL, nem a senha do painel (digite com o campo oculto).
- Escolha uma data **futura** para agendar (o sistema não aceita datas passadas).
- Tenha o **Workbench** aberto com `SELECT * FROM agendamento;` pronto e um terminal na pasta `backend` com o resultado do `npm run verificar` já executado.
- Teste o microfone gravando 10 segundos.

**Como gravar:**
- **Tela do computador:** **OBS Studio** (gratuito, obsproject.com), fonte "Captura de tela", gravação em MP4. Alternativa: **Win + Alt + R** (Xbox Game Bar) grava a janela do aplicativo.
- **Tela do celular (Android):** deslize a barra de atalhos, toque em **Gravação de tela** (ou "Gravador de tela"), ative o microfone se quiser. Se o celular não tiver, use o app gratuito de gravação da Play Store.
- Grave **em partes curtas** (uma por cena) e junte depois: se errar, refaz só a cena.

**Roteiro sugerido (5 a 7 min; confirme o limite no AVA):**

| Tempo | Cena | O que falar/mostrar |
|---|---|---|
| 0:00 a 0:30 | Abertura | Nome do grupo, curso, tema do Projeto Integrador |
| 0:30 a 1:15 | Problema | Profissional que agenda por caderno e WhatsApp, conflitos de horário |
| 1:15 a 1:45 | Solução | Sistema web para computador e celular. Tecnologias: React, Node/Express e MySQL |
| 1:45 a 4:00 | Demonstração no PC | Home com serviços → escolher serviço → agendar sem conta → confirmação → tentar o mesmo horário (aparece indisponível) → entrar no painel: dashboard, agenda, serviços, horários e folga |
| 4:00 a 5:00 | Celular | Instalar o app pelo Chrome, abrir pelo ícone, agendar e mostrar que o agendamento aparece no painel do PC |
| 5:00 a 5:45 | Banco e testes | Workbench com o agendamento gravado; terminal com `npm run verificar` (tudo OK); testes automatizados |
| 5:45 a 6:30 | Resultados e fecho | Validação com a profissional, limitações (sem pagamento online, sem lembretes automáticos) e trabalhos futuros; agradecimento |

**Edição e envio:**
- Junte e corte no **Clipchamp** (já vem no Windows 11) ou no **CapCut**. Exporte em **MP4, 1080p ou 720p**.
- Para enviar ao grupo, suba no **Google Drive** ou no **YouTube como "não listado"** e compartilhe o link. O WhatsApp reduz a qualidade de vídeos grandes.
- A entrega oficial é da Samara pelo AVA, em **06/11**.

## Parte 10. Problemas comuns

| Sintoma | O que fazer |
|---|---|
| `npm error ENOENT package.json` | Você está na pasta errada: entre em `backend` ou `frontend` |
| `ECONNREFUSED 127.0.0.1:3001` | A API não está rodando: abra o terminal do `backend` e rode `npm start` |
| `Access denied for user 'root'` | Senha errada no `.env` (ou caractere especial sem codificar) |
| `Unknown database` | O script `01` não foi executado |
| `Duplicate column name` | O script `02` foi rodado mais de uma vez |
| `EADDRINUSE` | Já existe outro programa na mesma porta: feche o terminal antigo |
| Celular não abre o endereço | Mesmo Wi-Fi? Rede como Privada? Firewall liberado? IP mudou? |
| Site velho no celular depois de atualizar | Rode `npm run build` de novo e, no Chrome do celular, limpe os dados do site |
| Botão "Instalar" não aparece | Precisa de HTTPS (túnel) e da versão `preview` (não `dev`) |

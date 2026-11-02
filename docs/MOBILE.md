# Suporte ao celular (Android e iPhone)

## Situação atual
1. **Site responsivo** (já pronto): funciona no navegador do celular, Android e iPhone, sem instalar nada.
2. **App instalável (PWA)** (código pronto): o mesmo site pode ser colocado na tela inicial, com ícone, abrindo em tela cheia, como um app.
   - **Android (Chrome e similares):** aparece o botão **“Instalar o app no celular”** no rodapé. Também está no menu do navegador (“Instalar app”).
   - **iPhone/iPad (Safari):** o sistema não oferece botão; o rodapé mostra o passo a passo: **Compartilhar → Adicionar à Tela de Início**.
   - Sem internet, o app abre a última versão guardada da tela, mas **não** agenda nem consulta horários (a API nunca é guardada no aparelho, por privacidade).

### Para a instalação funcionar
- O site precisa ser aberto por **HTTPS** (por exemplo, com o túnel temporário do passo a passo) ou em `localhost`. Em `http://IP-do-computador` o navegador **não** oferece instalação.
- Só funciona na versão de produção (`npm run build` e `npm run preview`); em `npm run dev` o *service worker* fica desligado de propósito.
- Arquivos: `frontend/public/manifest.webmanifest`, `frontend/public/sw.js`, `frontend/public/icons/` e `frontend/src/instalar.jsx`.
- Ao trocar o **nome/cores do salão**, ajuste também o `manifest.webmanifest` (`name`, `short_name`, `theme_color`) e refaça os ícones. Ao atualizar o site com mudanças grandes, aumente `VERSAO` em `sw.js`.

### Como testar
- **Android:** abrir o endereço https no Chrome, esperar alguns segundos e tocar em “Instalar o app”. Conferir o ícone na tela inicial e se abre em tela cheia.
- **iPhone:** abrir no Safari, Compartilhar → Adicionar à Tela de Início.
- No computador: Chrome, F12 → aba **Application** → *Manifest* e *Service Workers*; ou Lighthouse → categoria PWA.

# Suporte ao celular (Android e iPhone)

## Situação atual
1. **Site responsivo** (já pronto): funciona no navegador do celular, Android e iPhone, sem instalar nada.
2. **App instalável (PWA)** (código pronto): o mesmo site pode ser colocado na tela inicial, com ícone, abrindo em tela cheia, como um app.
   - **Android (Chrome e similares):** aparece o botão **“Instalar o app no celular”** no rodapé. Também está no menu do navegador (“Instalar app”).
   - **iPhone/iPad (Safari):** o sistema não oferece botão; o rodapé mostra o passo a passo: **Compartilhar → Adicionar à Tela de Início**.
   - Sem internet, o app abre a última versão guardada da tela, mas **não** agenda nem consulta horários (a API nunca é guardada no aparelho, por privacidade).

### Para a instalação funcionar
- O site precisa estar **publicado com HTTPS** (ou aberto em `localhost`). Em `http://IP-do-computador` o navegador **não** oferece instalação.
- Só funciona na versão de produção (`npm run build` e hospedagem); em `npm run dev` o *service worker* fica desligado de propósito.
- Arquivos: `frontend/public/manifest.webmanifest`, `frontend/public/sw.js`, `frontend/public/icons/` e `frontend/src/instalar.jsx`.
- Ao trocar o **nome/cores do salão**, ajuste também o `manifest.webmanifest` (`name`, `short_name`, `theme_color`) e refaça os ícones. Ao publicar uma versão com mudanças grandes, aumente `VERSAO` em `sw.js`.

### Como testar
- **Android:** abrir o endereço https no Chrome, esperar alguns segundos e tocar em “Instalar o app”. Conferir o ícone na tela inicial e se abre em tela cheia.
- **iPhone:** abrir no Safari, Compartilhar → Adicionar à Tela de Início.
- No computador: Chrome, F12 → aba **Application** → *Manifest* e *Service Workers*; ou Lighthouse → categoria PWA.

## App nativo (Play Store e App Store): melhoria futura
Dá para empacotar o mesmo site em um app de loja com o **Capacitor** (sem reescrever o React). Custos e requisitos:

| | Android | iPhone (iOS) |
|---|---|---|
| Ferramenta | Android Studio | **Mac com Xcode** |
| Conta de loja | Google Play Console (taxa única, ~US$ 25) | Apple Developer Program (**anual, ~US$ 99**) |
| Publicação | Aprovação do Google | Aprovação da Apple (mais rigorosa) |

(Valores de referência; confirme nos sites oficiais.) Ordem sugerida, como pedido: **PWA agora → Android com Capacitor → iOS por último**, porque o iOS exige Mac e conta paga. A API precisaria estar publicada em HTTPS, e o app passaria a chamar o endereço público dela.
Para a profissional, o PWA costuma bastar: não tem custo de loja nem aprovação.

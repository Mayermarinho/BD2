import { useEffect, useState } from 'react';

const emModoApp = () =>
  Boolean(window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone);

const ehIos = () =>
  /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
  (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);

/**
 * Convite para instalar o site como app no celular.
 * - Android (Chrome e similares): botão "Instalar o app" quando o navegador permite.
 * - iPhone/iPad (Safari): não há botão no sistema; mostra o passo a passo.
 * Some sozinho se o app já estiver instalado/aberto como app.
 */
export function InstalarApp() {
  const [evento, setEvento] = useState(null);
  const [instalado, setInstalado] = useState(false);

  useEffect(() => {
    const aoOferecer = (e) => { e.preventDefault(); setEvento(e); };
    const aoInstalar = () => { setInstalado(true); setEvento(null); };
    window.addEventListener('beforeinstallprompt', aoOferecer);
    window.addEventListener('appinstalled', aoInstalar);
    return () => {
      window.removeEventListener('beforeinstallprompt', aoOferecer);
      window.removeEventListener('appinstalled', aoInstalar);
    };
  }, []);

  if (instalado || emModoApp()) return null;

  if (evento) {
    return (
      <button type="button" className="btn btn--link instalar" onClick={async () => { evento.prompt(); await evento.userChoice; setEvento(null); }}>
        📲 Instalar o app no celular
      </button>
    );
  }

  if (ehIos()) {
    return (
      <details className="instalar instalar--ios">
        <summary>📲 Instalar no iPhone</summary>
        <p>No <strong>Safari</strong>, toque em <strong>Compartilhar</strong> (quadrado com seta para cima) e depois em <strong>“Adicionar à Tela de Início”</strong>.</p>
      </details>
    );
  }
  return null;
}

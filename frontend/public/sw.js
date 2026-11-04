// Service worker do app instalável (PWA).
// - NUNCA guarda respostas da API (/api): dados de agendamentos e contas ficam só na rede.
// - Páginas: tenta a rede primeiro; sem internet, mostra a última versão guardada do site.
// - Arquivos estáticos (JS, CSS, imagens): usa a cópia guardada e atualiza em segundo plano.
// Para forçar a atualização do cache em uma nova versão, aumente VERSAO.
const VERSAO = 'v1';
const CACHE = `aurora-${VERSAO}`;
const BASICOS = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASICOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n.startsWith('aurora-') && n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api')) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((r) => { const copia = r.clone(); caches.open(CACHE).then((c) => c.put('/', copia)); return r; })
        .catch(() => caches.match('/')),
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((guardado) => {
      const rede = fetch(req)
        .then((r) => { if (r.ok) { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); } return r; })
        .catch(() => guardado);
      return guardado || rede;
    }),
  );
});


// Web Push: a API envia o payload após confirmar o agendamento no banco.
self.addEventListener('push', (event) => {
  let dados = {};
  try { dados = event.data ? event.data.json() : {}; }
  catch { dados = { body: event.data?.text() || 'Há uma atualização na sua agenda.' }; }

  const titulo = dados.title || 'Novo agendamento';
  const opcoes = {
    body: dados.body || 'Um cliente acabou de solicitar um horário.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: dados.tag || 'agendamento-novo',
    renotify: true,
    data: { url: dados.url || '/admin/agenda' },
  };
  event.waitUntil(self.registration.showNotification(titulo, opcoes));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = new URL(event.notification.data?.url || '/admin/agenda', self.location.origin).href;
  event.waitUntil((async () => {
    const clientes = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const cliente of clientes) {
      if (cliente.url.startsWith(self.location.origin) && 'focus' in cliente) {
        await cliente.focus();
        if ('navigate' in cliente) await cliente.navigate(destino);
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(destino);
  })());
});

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

/* Service worker do SGVC.
 * - Navegacao: rede primeiro; sem rede, mostra /offline.html.
 * - Arquivos estaticos do mesmo dominio (css/js): rede primeiro, cache so como fallback offline (deploys novos chegam sem esperar).
 * - Icones/fontes: cache primeiro.
 * - NUNCA guarda /api, requisicoes que nao sejam GET, nem outros dominios (dados e sessao ficam sempre na rede).
 */
const VERSION = 'sgvc-v3';
const SHELL = ['/offline.html', '/offline.css', '/offline.js', '/icons/icon-192.png', '/static/base.css'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const isStaticAsset = (url) => /\.(css|js|png|svg|ico|webmanifest|woff2?)$/i.test(url.pathname);

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname === '/config.js' || url.pathname === '/theme.css' || url.pathname === '/sw.js') return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/offline.html')));
    return;
  }

  if (isStaticAsset(url)) {
    const cacheFirst = /\.(png|svg|ico|woff2?)$/i.test(url.pathname);
    event.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const cached = await cache.match(request);
        if (cacheFirst && cached) return cached;
        try {
          const res = await fetch(request);
          if (res && res.ok) cache.put(request, res.clone());
          return res;
        } catch (_err) {
          if (cached) return cached;
          throw _err;
        }
      })
    );
  }
});

/* Codex Service Worker */
const CACHE = 'codex-v1';               // bei jedem Deploy hochzählen: codex-v2, v3 …
const ASSETS = [
  './codex.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);

  // Sync-Backend und alle Nicht-GET-Requests niemals cachen -> direkt durchreichen
  if (req.method !== 'GET' || url.hostname.endsWith('workers.dev')) {
    return; // Browser übernimmt (Netzwerk)
  }

  // Nur eigene Origin cachen; Fonts o. Ä. opportunistisch
  if (url.origin === self.location.origin) {
    // cache-first für App-Shell, im Hintergrund aktualisieren
    e.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(res => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
          }
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
  }
});

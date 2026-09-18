const CACHE_NAME = 'spanish-quest-v4';
const ASSETS = [
  './',
  './index.html',
  './css/main.css',
  './css/retro.css',
  './css/exercises.css',
  './css/adventure.css',
  './css/wordblocks.css',
  './css/importer.css',
  './js/app.js',
  './js/game.js',
  './js/srs.js',
  './js/exercises.js',
  './js/audio.js',
  './js/storage.js',
  './js/ui.js',
  './js/langpack.js',
  './js/voice.js',
  './js/adventure.js',
  './js/wordblocks.js',
  './js/importer.js',
  './data/packs/index.json',
  './data/packs/es/pack.json',
  './data/packs/es/curriculum.json',
  './data/packs/es/vocabulary.json',
  './data/packs/es/dialogues.json',
  './data/achievements.json',
  './manifest.json',
  './assets/sprites/icon-192.png',
  './assets/sprites/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) =>
      cached ||
      fetch(e.request).then((res) => {
        // Runtime-cache successful GETs (includes Google Fonts CSS + woff2)
        // so the retro font survives offline.
        if (res.ok || res.type === 'opaque') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      }).catch(() => {
        if (e.request.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      })
    )
  );
});

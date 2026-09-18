const CACHE_NAME = 'spanish-quest-v2';
const ASSETS = [
  './',
  './index.html',
  './css/main.css',
  './css/retro.css',
  './css/exercises.css',
  './js/app.js',
  './js/game.js',
  './js/srs.js',
  './js/exercises.js',
  './js/audio.js',
  './js/storage.js',
  './js/ui.js',
  './js/langpack.js',
  './data/packs/index.json',
  './data/packs/es/pack.json',
  './data/packs/es/curriculum.json',
  './data/packs/es/vocabulary.json',
  './data/packs/es/dialogues.json',
  './data/achievements.json',
  './manifest.json'
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
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});

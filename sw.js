const CACHE_NAME = 'spanish-quest-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/main.css',
  '/css/retro.css',
  '/css/exercises.css',
  '/js/app.js',
  '/js/game.js',
  '/js/srs.js',
  '/js/exercises.js',
  '/js/audio.js',
  '/js/storage.js',
  '/js/ui.js',
  '/data/curriculum.json',
  '/data/vocabulary.json',
  '/data/dialogues.json',
  '/data/achievements.json',
  '/manifest.json'
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

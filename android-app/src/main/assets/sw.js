// pwa/sw.js - FactQuizzer Service Worker for Android PWA & Offline Support
const CACHE_NAME = 'factquizzer-pwa-v2';
const ASSETS_TO_CACHE = [
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon128.png',
  './icons/icon192.png',
  './icons/icon512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Pass external API requests straight to network
  if (event.request.url.includes('googleapis.com') || event.request.url.includes('youtube.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        return response;
      }).catch(() => {
        // Fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

'use strict';

// Bump CACHE_VERSION when deploying significant changes to force all clients
// to discard the old cache and fetch fresh files.
const CACHE_VERSION = 'v4';
const CACHE_NAME    = `ijerkit-cache-${CACHE_VERSION}`;

// These files change with each deploy — always try the network first.
const NETWORK_FIRST_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
];

// Icons and manifest rarely change — safe to serve from cache indefinitely.
const CACHE_FIRST_ASSETS = [
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.allSettled(
        [...NETWORK_FIRST_ASSETS, ...CACHE_FIRST_ASSETS].map(url => cache.add(url))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

function isNetworkFirst(request) {
  const path = new URL(request.url).pathname;
  return path.endsWith('/')
      || path.endsWith('/index.html')
      || path.endsWith('/styles.css')
      || path.endsWith('/app.js');
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  if (isNetworkFirst(event.request)) {
    // Try the network; on success update the cache so offline still works.
    // Fall back to stale cache only when the network is unavailable.
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Static assets: serve from cache; fall back to network on a cache miss.
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
  }
});

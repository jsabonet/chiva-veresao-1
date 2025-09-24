// No-op service worker that disables caching
self.addEventListener('install', function(event) {
  console.log('No-cache service worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('No-cache service worker activated');
  // Clear all caches
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          console.log('Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  // Let the browser handle all requests normally (no caching)
  return;
});

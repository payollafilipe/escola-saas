// Worker de transição: apaga caches antigos do app e se remove após a atualização.
// Não importa scripts de terceiros, não intercepta requisições e não guarda dados offline.
const APP_CACHE_PREFIX = 'jma-intranet-';

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(APP_CACHE_PREFIX)).map(name => caches.delete(name)));
    await self.registration.unregister();
  })());
});

// Worker legado neutro para que versões atualizadas deixem de carregar o SDK de push.
self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', event => {
  event.waitUntil(self.registration.unregister());
});

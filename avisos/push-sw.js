// Recebe o alerta de push e abre a caixa de avisos. Não guarda cache nem dados offline.
// A notificação nunca carrega o texto do aviso: o conteúdo só aparece depois do login no site.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener("push", e => {
  e.waitUntil(self.registration.showNotification("Novo aviso · JMA", {
    body: "Toque para abrir a caixa de avisos.",
    icon: "/jma-192.png", badge: "/jma-192.png", tag: "aviso-jma", data: { url: "/avisos/" }
  }));
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/avisos/";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(lista => {
    for (const c of lista) if (c.url.includes("/avisos/") && "focus" in c) return c.focus();
    return self.clients.openWindow(url);
  }));
});

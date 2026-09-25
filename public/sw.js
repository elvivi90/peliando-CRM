// Service worker: habilita "instalar" la PWA y recibe las notificaciones
// push. El CRM necesita datos siempre frescos, asi que no cachea nada —
// cada fetch va a la red.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // passthrough intencional
});

// Payload armado en lib/services/notificaciones.ts.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { cuerpo: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    self.registration.showNotification(data.titulo || "CRM Peliando", {
      body: data.cuerpo || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag,
      data: { url: data.url || "/dashboard" },
    }),
  );
});

// Si la app ya esta abierta, la reusa y navega; si no, abre una ventana.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/dashboard", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      for (const ventana of ventanas) {
        if (new URL(ventana.url).origin === self.location.origin && "focus" in ventana) {
          return ventana.navigate(url).then((v) => (v || ventana).focus());
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

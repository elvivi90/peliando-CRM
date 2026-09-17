// Service worker minimo: solo habilita "instalar" la PWA. El CRM necesita
// datos siempre frescos, asi que no cachea nada — cada fetch va a la red.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // passthrough intencional
});

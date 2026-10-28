/* Service Worker Devizier AI — instalare PWA + cache offline + update automat + notificări push */
const CACHE = "devizier-v6";
const APP_VERSION = "3.1.0";
const CORE = [
  "/",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icons/icon-96.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Mesaje de la pagină: SKIP_WAITING = activează imediat versiunea nouă (update automat)
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

// Răspuns la ping-ul de versiune din pagină
self.addEventListener("message", (event) => {
  if (event.data === "GET_VERSION") {
    event.source?.postMessage({ type: "VERSION", version: APP_VERSION });
  }
});

/* ── Notificări push ──────────────────────────────────────────────
   Primită de server când apare o versiune nouă. Pe Android notificarea
   apare în fereastră plutitoare (heads-up) chiar și cu aplicația
   complet închisă; pe iPhone doar pentru aplicația instalată din Safari. */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Devizier AI", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Devizier AI — versiune nouă";
  const body =
    data.body ||
    "O versiune nouă a aplicației este disponibilă și se instalează automat la următoarea deschidere.";
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: data.icon || "/icons/icon-192.png",
      badge: "/icons/icon-96.png",
      tag: data.tag || "devizier-update",
      renotify: true,
      vibrate: [200, 100, 200, 100, 200],
      data: { url: data.url || "/" },
    })
  );
});

/* Click pe notificare → deschide aplicația (sau aduce în față fereastra existentă) */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) return client.focus();
        }
        return self.clients.openWindow(url);
      })
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // datele API niciodată din cache

  const isImmutable =
    url.pathname.startsWith("/icons/") ||
    /\.(png|webp|jpg|jpeg|gif|ico|svg|woff2?)$/.test(url.pathname);

  if (isImmutable) {
    // cache-first DOAR pentru active practic imuabile (iconițe, fonturi, imagini);
    // chunk-urile JS/CSS rămân network-first ca să nu servească cod învechit
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((resp) => {
            const copy = resp.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return resp;
          })
      )
    );
  } else {
    // network-first pentru pagini/navigare (evită conținut învechit)
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const cc = resp.headers.get("cache-control") || "";
          if (!cc.includes("no-store")) {
            const copy = resp.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return resp;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match("/")))
    );
  }
});

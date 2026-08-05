// Service worker for Web Push. Shows an OS notification for each push and focuses
// (or opens) the lobby when one is clicked. Payload shape mirrors push.dispatch()
// on the server: { kind, title, body, data }.
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Nova Casino", body: event.data ? event.data.text() : "" };
  }
  const title = payload.title || "Nova Casino";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: payload.kind || "casino",
      data: payload.data || {},
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const win = all.find((c) => "focus" in c);
      if (win) return win.focus();
      if (self.clients.openWindow) return self.clients.openWindow("/");
    })(),
  );
});

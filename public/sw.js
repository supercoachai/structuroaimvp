/* eslint-disable no-restricted-globals */
self.addEventListener("push", function (event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Structuro", {
      body: data.body || "Je hebt een melding",
      icon: "/logo-structuro.png",
      badge: "/logo-structuro.png",
      data: { url: data.url || "/shutdown" },
      requireInteraction: false,
    })
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const raw = event.notification.data && event.notification.data.url;
  let urlToOpen = "/shutdown";
  if (typeof raw === "string" && raw.startsWith("/")) {
    if (raw.startsWith("/shutdown")) {
      urlToOpen = raw.split("#")[0];
    } else if (raw.startsWith("/dagstart")) {
      urlToOpen = raw.split("#")[0];
    }
  }
  const fullUrl = new URL(urlToOpen, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (windowClients) {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus().then(function () {
            if ("navigate" in client) {
              return client.navigate(fullUrl);
            }
          });
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(fullUrl);
      }
    })
  );
});

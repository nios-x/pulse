// Pulse service worker. Health data is never cached: every request goes to the
// network. When a page can't load (no signal), show a small offline notice.
const OFFLINE_HTML = `<!doctype html><html lang="hi"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pulse</title>
<body style="font-family:system-ui,sans-serif;padding:24px;background:#fbfaf6;color:#1d2a33">
<h1 style="font-size:22px">इंटरनेट नहीं है</h1>
<p style="font-size:18px">नेटवर्क मिलने पर फिर से खोलें। इमरजेंसी में <a href="tel:112">112</a> या <a href="tel:108">108</a> पर कॉल करें।</p>
<h1 style="font-size:22px">You're offline</h1>
<p style="font-size:18px">Open Pulse again when you have signal. In an emergency call <a href="tel:112">112</a> or <a href="tel:108">108</a>.</p>
</body></html>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(
      () => new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } })
    )
  );
});

// Dose reminders (phase 10). Tapping one opens the Due now card.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Pulse", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Pulse", {
      body: data.body || "",
      tag: data.tag,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/home" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/home", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin && "navigate" in client) {
          await client.focus();
          return client.navigate(url);
        }
      }
      return self.clients.openWindow(url);
    })()
  );
});

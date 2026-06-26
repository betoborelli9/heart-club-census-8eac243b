/* Heart Club — Web Push Service Worker (isolado).
 * Não cacheia rotas, não interfere com Vite/preview. Só recebe push e abre URL. */

self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: 'Heart Club', body: event.data?.text() || '' }; }
  const title = data.title || 'Heart Club';
  const options = {
    body: data.body || '',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.payload?.fixture_id ? `fx-${data.payload.fixture_id}-${data.type || 'n'}` : undefined,
    data: { url: data.payload?.url || '/dashboard', ...data.payload },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) { if (c.url.includes(url)) { c.focus(); return; } }
    self.clients.openWindow(url);
  })());
});

/* Heart Club — Web Push Service Worker (isolado).
 * Não cacheia rotas, não interfere com Vite/preview. Push + actions de opt-out. */

self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: 'Heart Club', body: event.data?.text() || '' }; }
  const title = data.title || 'Heart Club';
  const actions = [];
  if (data.payload?.unsub_url) {
    actions.push({ action: 'unsub', title: '🔕 Parar estas notificações' });
  }
  const options = {
    body: data.body || '',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.payload?.fixture_id ? `fx-${data.payload.fixture_id}-${data.type || 'n'}` : undefined,
    data: { url: data.payload?.url || '/dashboard', unsub_url: data.payload?.unsub_url, type: data.type },
    actions,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { url, unsub_url } = event.notification.data || {};

  if (event.action === 'unsub' && unsub_url) {
    event.waitUntil(fetch(unsub_url, { method: 'GET', mode: 'no-cors' }).catch(() => {}));
    return;
  }

  const target = url || '/dashboard';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) { if (c.url.includes(target)) { c.focus(); return; } }
    self.clients.openWindow(target);
  })());
});

// Service Worker for Rescátalo Venezuela
// Enables Web Push Notifications, Background Alerts and FCM compatibility

const CACHE_NAME = 'rescatalo-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clear old caches if any
      caches.keys().then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      ),
    ])
  );
});

// Web Push / FCM Push notification handler
self.addEventListener('push', (event) => {
  let data = {
    title: 'Rescátalo Venezuela',
    body: 'Nueva actualización de tu servicio',
    icon: '/vite.svg',
    tag: 'rescatalo-alert',
  };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const title = data.title || (data.notification && data.notification.title) || 'Rescátalo Venezuela';
  const body =
    data.body ||
    (data.notification && data.notification.body) ||
    'Alerta de servicio en tiempo real en Valle de la Pascua';

  const options = {
    body,
    icon:
      data.icon ||
      'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=128&auto=format&fit=crop&q=80',
    badge:
      data.badge ||
      'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=64&auto=format&fit=crop&q=80',
    vibrate: [250, 100, 250, 100, 250],
    data: data.data || {},
    tag: data.tag || `rescatalo-push-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    actions: [
      { action: 'open_app', title: 'Ver en Rescátalo' },
      { action: 'dismiss', title: 'Cerrar' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Click notification handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

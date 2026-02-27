// Service Worker for Web Push Notifications
// This file handles push notifications even when the app is closed

self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

// Helper to check if we can show notifications
async function canShowNotifications() {
  try {
    // Try to check permission using the registration API (newer browsers)
    if (self.registration && typeof self.registration.permissionState === 'function') {
      const permission = await self.registration.permissionState();
      console.log('[SW] Notification permission state:', permission);
      return permission === 'granted';
    }
    // Fallback: assume granted if we can't check (for older browsers)
    // The browser will reject the showNotification call if permission is not granted
    console.log('[SW] Permission state API not available, assuming granted');
    return true;
  } catch (e) {
    console.error('[SW] Error checking permission:', e);
    // Assume granted if we can't check (for older browsers)
    return true;
  }
}

// Handle push notifications
self.addEventListener('push', async (event) => {
  console.log('[SW] Push received:', event);
  
  // Check permission first
  const hasPermission = await canShowNotifications();
  if (!hasPermission) {
    console.warn('[SW] Cannot show notification - permission not granted');
    return;
  }
  
  let data = {};
  try {
    if (event.data) {
      data = event.data.json();
      console.log('[SW] Parsed push data:', data);
    } else {
      console.warn('[SW] Push event has no data');
      data = { 
        title: 'GoldVision Alert', 
        body: 'You have a new alert' 
      };
    }
  } catch (e) {
    console.error('[SW] Failed to parse push data:', e);
    data = { 
      title: 'GoldVision Alert', 
      body: 'You have a new alert' 
    };
  }

  // Build notification options with fallbacks
  const options = {
    body: data.body || 'You have a new notification',
    icon: data.icon || '/logo-192.png',
    badge: data.badge || '/badge-72.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'goldvision-alert',
    requireInteraction: data.requireInteraction || false,
    data: data.data || {},
    silent: false,
    renotify: true
  };

  // Only add actions if they're provided and valid
  if (data.actions && Array.isArray(data.actions) && data.actions.length > 0) {
    options.actions = data.actions;
  }

  console.log('[SW] Showing notification with options:', {
    title: data.title || 'GoldVision',
    body: options.body,
    icon: options.icon,
    tag: options.tag
  });

  event.waitUntil(
    self.registration.showNotification(data.title || 'GoldVision', options)
      .then(() => {
        console.log('[SW] ✅ Notification shown successfully');
      })
      .catch((error) => {
        console.error('[SW] ❌ Failed to show notification:', error);
        // Try again with minimal options if the first attempt failed
        const minimalOptions = {
          body: data.body || 'You have a new notification',
          tag: 'goldvision-alert',
          data: data.data || {},
          icon: '/logo-192.png'
        };
        return self.registration.showNotification(
          data.title || 'GoldVision',
          minimalOptions
        ).then(() => {
          console.log('[SW] ✅ Notification shown with minimal options');
        }).catch((minimalError) => {
          console.error('[SW] ❌ Failed to show notification even with minimal options:', minimalError);
        });
      })
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/alerts';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus().then((client) => {
              if ('navigate' in client) {
                return client.navigate(urlToOpen);
              }
            });
          }
        }
        
        // Open new window if none exists
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event);
});


/**
 * StubBook Service Worker
 * 提供現場無網路環境之離線票夾、擬真票根與資料快取支援
 */

const CACHE_VERSION = 'stubbook-v1';
const STATIC_CACHE = `stubbook-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `stubbook-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `stubbook-images-${CACHE_VERSION}`;

const PRECACHE_ASSETS = ['/', '/manifest.json', '/icons/icon.svg'];

// 1. 安裝階段：預先快取核心 App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// 2. 啟用階段：清除過期舊快取
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter(
              (name) =>
                name.startsWith('stubbook-') &&
                name !== STATIC_CACHE &&
                name !== DYNAMIC_CACHE &&
                name !== IMAGE_CACHE
            )
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// 3. 請求攔截與離線降級快取
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 僅處理同源 GET 請求
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // 策略 A: 票根圖片與戰利品上傳 (/uploads/*) -> Cache First，若有網路則背景更新
  if (url.pathname.startsWith('/uploads/')) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          // 背景嘗試更新最新檔案
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse.ok) cache.put(request, networkResponse.clone());
            })
            .catch(() => {});
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          // 若圖片尚未快取且無網路，返回預設佔位圖或 404
          return cachedResponse || new Response('Image unavailable offline', { status: 503 });
        }
      })
    );
    return;
  }

  // 策略 B: 資料 API (/api/events, /api/attendances 等) -> Network First，斷網時回傳快取
  if (
    url.pathname.startsWith('/api/events') ||
    url.pathname.startsWith('/api/attendances') ||
    url.pathname.startsWith('/api/merchandise') ||
    url.pathname.startsWith('/api/media')
  ) {
    event.respondWith(
      fetch(request)
        .then(async (networkResponse) => {
          if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(async () => {
          // 網路失敗 (現場離線模式) -> 自動回傳最新快取資料
          const cache = await caches.open(DYNAMIC_CACHE);
          const cachedResponse = await cache.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          return new Response(
            JSON.stringify({ error: '現場網路離線，且無本機快取資料', offline: true }),
            { headers: { 'Content-Type': 'application/json' }, status: 503 }
          );
        })
    );
    return;
  }

  // 策略 C: 頁面與靜態資源 -> Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then(async (networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => {
          // 若無網路且存取頁面，回傳預快取的根頁面
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});

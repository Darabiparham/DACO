const CACHE_NAME = 'daco-storymaker-v3.0.0';
const OFFLINE_URL = './offline.html';

// فایل‌های ضروری برای کارکرد آفلاین
const ESSENTIAL_FILES = [
    './',
    './index.html',
    './manifest.json',
    './css/styles.css',
    './css/animations.css', 
    './css/responsive.css',
    './css/dark-mode.css',
    './js/app.js',
    './js/canvas.js',
    './js/controls.js',
    './js/export.js',
    './js/gestures.js',
    './js/pwa.js',
    './js/utils.js',
    './offline.html',
    './icons/android-icon-192x192.png',
    './icons/android-icon-512x512.png'
];

// فایل‌های قابل کش کردن (غیرضروری)
const CACHEABLE_FILES = [
    './images/og-image-1200x630.png',
    './images/twitter-card-1200x600.png',
    './images/screenshot-narrow.png',
    './images/screenshot-wide.png',
    './favicon.ico'
];

// فونت‌های خارجی
const EXTERNAL_RESOURCES = [
    'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@100;200;300;400;500;600;700;800;900&family=Lalezar:wght@400&family=Amiri:ital,wght@0,400;0,700;1,400;1,700&family=Markazi+Text:wght@400;500;600;700&family=Noto+Naskh+Arabic:wght@400;500;600;700&family=Inter:wght@100;200;300;400;500;600;700;800;900&family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap'
];

// نصب Service Worker
self.addEventListener('install', event => {
    console.log('[SW] Installing...');
    
    event.waitUntil(
        (async () => {
            try {
                const cache = await caches.open(CACHE_NAME);
                
                // کش کردن فایل‌های ضروری
                console.log('[SW] Caching essential files...');
                await cache.addAll(ESSENTIAL_FILES);
                
                // کش کردن فایل‌های اختیاری (بدون شکست در صورت خطا)
                console.log('[SW] Caching optional files...');
                await Promise.allSettled(
                    CACHEABLE_FILES.map(file => 
                        cache.add(file).catch(err => 
                            console.warn(`[SW] Failed to cache ${file}:`, err)
                        )
                    )
                );
                
                // کش کردن منابع خارجی
                console.log('[SW] Caching external resources...');
                await Promise.allSettled(
                    EXTERNAL_RESOURCES.map(url =>
                        cache.add(url).catch(err =>
                            console.warn(`[SW] Failed to cache ${url}:`, err)
                        )
                    )
                );
                
                console.log('[SW] Installation completed');
                self.skipWaiting();
            } catch (error) {
                console.error('[SW] Installation failed:', error);
            }
        })()
    );
});

// فعال‌سازی Service Worker
self.addEventListener('activate', event => {
    console.log('[SW] Activating...');
    
    event.waitUntil(
        (async () => {
            try {
                // پاک کردن کش‌های قدیمی
                const cacheNames = await caches.keys();
                await Promise.all(
                    cacheNames
                        .filter(cacheName => 
                            cacheName.startsWith('daco-storymaker-') && 
                            cacheName !== CACHE_NAME
                        )
                        .map(cacheName => {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
                
                // تصاحب کنترل همه کلاینت‌ها
                await self.clients.claim();
                console.log('[SW] Activation completed');
            } catch (error) {
                console.error('[SW] Activation failed:', error);
            }
        })()
    );
});

// رهگیری درخواست‌ها
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // فقط درخواست‌های HTTP/HTTPS را پردازش کن
    if (!url.protocol.startsWith('http')) {
        return;
    }
    
    // استراتژی‌های مختلف برای انواع مختلف درخواست‌ها
    if (request.method === 'GET') {
        if (url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname === './') {
            // صفحات HTML: Cache First with Network Fallback
            event.respondWith(handleHTMLRequest(request));
        } else if (url.pathname.includes('/api/') || url.hostname !== location.hostname) {
            // API calls و منابع خارجی: Network First
            event.respondWith(handleNetworkFirst(request));
        } else if (url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf)$/)) {
            // استاتیک assets: Cache First
            event.respondWith(handleCacheFirst(request));
        } else {
            // سایر درخواست‌ها: Network with Cache Fallback
            event.respondWith(handleNetworkWithCacheFallback(request));
        }
    }
});

// مدیریت درخواست‌های HTML
async function handleHTMLRequest(request) {
    try {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            // بررسی freshness در background
            fetchAndCache(request, cache);
            return cachedResponse;
        }
        
        // اگر کش نداریم، تلاش برای دریافت از شبکه
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
            return networkResponse;
        }
        
        throw new Error('Network response not ok');
    } catch (error) {
        console.log('[SW] Serving offline page');
        const cache = await caches.open(CACHE_NAME);
        return cache.match(OFFLINE_URL) || new Response('Offline content not available');
    }
}

// Network First Strategy
async function handleNetworkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        throw error;
    }
}

// Cache First Strategy
async function handleCacheFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.warn('[SW] Failed to fetch:', request.url);
        throw error;
    }
}

// Network with Cache Fallback
async function handleNetworkWithCacheFallback(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // اگر هیچ کدام در دسترس نبود، یک پاسخ پیش‌فرض برگردان
        return new Response('Content not available offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}

// Fetch and cache in background
async function fetchAndCache(request, cache) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse);
        }
    } catch (error) {
        console.warn('[SW] Background fetch failed:', error);
    }
}

// مدیریت پیام‌ها از کلاینت
self.addEventListener('message', event => {
    const { type, payload } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'GET_VERSION':
            event.ports[0].postMessage({ version: CACHE_NAME });
            break;
            
        case 'CLEAR_CACHE':
            clearAllCaches().then(() => {
                event.ports[0].postMessage({ success: true });
            });
            break;
            
        case 'CACHE_URLS':
            cacheUrls(payload.urls).then(() => {
                event.ports[0].postMessage({ success: true });
            });
            break;
    }
});

// پاک کردن همه کش‌ها
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
}

// کش کردن URL های جدید
async function cacheUrls(urls) {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(
        urls.map(url => cache.add(url).catch(err => console.warn(`Failed to cache ${url}:`, err)))
    );
}

// Background Sync برای ذخیره آفلاین
self.addEventListener('sync', event => {
    if (event.tag === 'save-story') {
        event.waitUntil(syncSavedStories());
    }
});

async function syncSavedStories() {
    try {
        // دریافت استوری‌های ذخیره شده آفلاین
        const savedStories = await getSavedStories();
        
        for (const story of savedStories) {
            try {
                // تلاش برای آپلود به سرور
                await uploadStory(story);
                // حذف از ذخیره محلی پس از آپلود موفق
                await removeSavedStory(story.id);
            } catch (error) {
                console.warn('Failed to sync story:', story.id, error);
            }
        }
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

// مدیریت Push Notifications
self.addEventListener('push', event => {
    if (!event.data) return;
    
    const data = event.data.json();
    const options = {
        body: data.body || 'اعلان جدید از DACO Storymaker Pro',
        icon: './icons/android-icon-192x192.png',
        badge: './icons/badge-72x72.png',
        image: data.image,
        data: data.data,
        actions: [
            {
                action: 'open',
                title: 'باز کردن',
                icon: './icons/action-open.png'
            },
            {
                action: 'dismiss',
                title: 'رد کردن',
                icon: './icons/action-dismiss.png'
            }
        ],
        requireInteraction: true,
        silent: false,
        vibrate: [200, 100, 200],
        timestamp: Date.now()
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'DACO Storymaker Pro', options)
    );
});

// مدیریت کلیک روی Notification
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    const action = event.action;
    const data = event.notification.data;
    
    if (action === 'dismiss') {
        return;
    }
    
    // باز کردن اپلیکیشن
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(clientList => {
            // اگر پنجره‌ای از اپلیکیشن باز است، فوکوس کن
            for (const client of clientList) {
                if (client.url.includes(location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            
            // در غیر این صورت پنجره جدید باز کن
            if (clients.openWindow) {
                const url = data?.url || './';
                return clients.openWindow(url);
            }
        })
    );
});

// Error handling
self.addEventListener('error', event => {
    console.error('[SW] Error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
    console.error('[SW] Unhandled promise rejection:', event.reason);
});

// Utility functions برای IndexedDB
async function getSavedStories() {
    // پیاده‌سازی دریافت استوری‌های ذخیره شده از IndexedDB
    return [];
}

async function uploadStory(story) {
    // پیاده‌سازی آپلود استوری به سرور
    const response = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(story)
    });
    
    if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
    }
    
    return response.json();
}

async function removeSavedStory(storyId) {
    // پیاده‌سازی حذف استوری از IndexedDB
}
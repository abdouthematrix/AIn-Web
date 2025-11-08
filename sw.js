// Service Worker for A-In (عين) - Attendance Management
const CACHE_NAME = 'a-in-v1.0.0';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/style.css',
    './locales/ar.json',
    './locales/en.json',
    './js/app.js',
    './js/config.js',
    './js/services/attendance.js',
    './js/services/auth.js',
    './js/services/company.js',
    './js/services/user.js',
    './js/utils/helpers.js',
    './js/utils/i18n.js',
    './js/utils/router.js',
    './js/utils/theme-manager.js',
    // Add other JS modules and assets
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/css/all.min.css',
    'https://www.gstatic.com/firebasejs/12.5.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/12.5.0firebase-auth-compat.js',
    'https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore-compat.js'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching app shell');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    // Skip Firebase API calls - let them handle their own caching
    if (event.request.url.includes('firebaseio.com') ||
        event.request.url.includes('googleapis.com') ||
        event.request.url.includes('firestore.googleapis.com')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                return response || fetch(event.request)
                    .then((fetchResponse) => {
                        // Cache new resources (only GET requests)
                        if (event.request.method === 'GET' &&
                            fetchResponse.status === 200) {
                            const responseToCache = fetchResponse.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        }
                        return fetchResponse;
                    });
            })
            .catch(() => {
                // Return offline page if available
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            })
    );
});

// Listen for messages from the app
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
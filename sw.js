// Service Worker 缓存配置
const CACHE_VERSION = 'md_editor_v1';
const CACHE_ASSETS = 'md_editor_assets_v1';

const assetsToCache = [
    'editor.html',
    'editor.css'
];

// 安装 Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_ASSETS).then((cache) => {
            // 尝试缓存资源，失败的话继续（某些资源可能无法缓存）
            return Promise.allSettled(
                assetsToCache.map(asset => cache.add(asset))
            ).then(() => {
                console.log('Service Worker 缓存资源完成');
            }).catch((err) => {
                console.log('Service Worker 缓存部分资源失败:', err);
            });
        }).then(() => self.skipWaiting())
    );
});

// 激活 Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // 清理旧版本缓存
                    if (cacheName !== CACHE_ASSETS && cacheName !== CACHE_VERSION) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 请求处理
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // 不缓存非 GET 请求
    if (request.method !== 'GET') {
        return;
    }

    // 图片请求：使用缓存优先策略
    if (url.pathname.startsWith('/img/')) {
        event.respondWith(
            caches.match(request).then((response) => {
                return response || fetch(request).then((response) => {
                    if (!response || response.status !== 200) {
                        return response;
                    }
                    const responseToCache = response.clone();
                    caches.open(CACHE_VERSION).then((cache) => {
                        cache.put(request, responseToCache);
                    });
                    return response;
                });
            }).catch(() => {
                // 离线状态下返回占位符
                return new Response(
                    'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
                    { headers: { 'Content-Type': 'image/gif' } }
                );
            })
        );
        return;
    }

    // 页面和样式表：使用网络优先策略
    if (request.mode === 'navigate' || request.destination === 'style' || request.destination === 'script') {
        event.respondWith(
            fetch(request).then((response) => {
                if (!response || response.status !== 200) {
                    return response;
                }
                const responseToCache = response.clone();
                caches.open(CACHE_ASSETS).then((cache) => {
                    cache.put(request, responseToCache);
                });
                return response;
            }).catch(() => {
                return caches.match(request);
            })
        );
        return;
    }

    // 默认：网络优先
    event.respondWith(
        fetch(request).then((response) => {
            if (!response || response.status !== 200) {
                return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_ASSETS).then((cache) => {
                cache.put(request, responseToCache);
            });
            return response;
        }).catch(() => {
            return caches.match(request);
        })
    );
});

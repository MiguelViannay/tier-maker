const CACHE_NAME = 'ov-tierlist-v1';

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(['./', './index.html', './style.css', './script.js']);
    }));
});

self.addEventListener('fetch', (event) => {
    // SEGREDO AQUI: Ignora requisições de outros sites (proxies, amazon, google)
    // Deixa o navegador resolver o CORS normalmente sem o Service Worker interferir
    if (!event.request.url.startsWith(self.location.origin)) {
        return; 
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request).catch((err) => {
                console.warn('Modo Offline: Não foi possível buscar o recurso local.', event.request.url);
            });
        })
    );
});
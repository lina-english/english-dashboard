/* 英语学习看板 · Service Worker
 * 缓存所有静态文件，让 PWA 在手机上离线也能用。
 * 更新内容时记得把 CACHE_NAME 的版本号往上加一。
 */

const CACHE_NAME = 'english-dashboard-v10';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './data/methods.js',
  './data/vocab.js',
  './data/templates.js',
  './data/fanxing/template.md',
  './manifest.json',
  // 图标
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  // iOS 启动图（Lina 是 iPhone 用户，全打包缓存）
  './icons/splash-1290x2796.png',
  './icons/splash-1179x2556.png',
  './icons/splash-1284x2778.png',
  './icons/splash-1170x2532.png',
  './icons/splash-1242x2688.png',
  './icons/splash-828x1792.png',
  './icons/splash-1125x2436.png',
  './icons/splash-1242x2208.png',
  './icons/splash-750x1334.png',
  './icons/splash-640x1136.png'
];

// 安装：把所有文件缓存下来
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE).catch((err) => {
        console.warn('[SW] 部分文件缓存失败（不影响主流程）:', err);
      });
    })
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
// 注意：故意不调用 self.clients.claim()。
// 原因：clients.claim() 会让新 SW 立刻接管"正在使用旧 SW 运行的页面"，
// 当用户正翻卡片 / 搜词时被换底层 → 资源请求路由突变 → 视觉抖动。
// 不 claim 的话：当前页面继续用旧 SW，直到用户下次刷新或重新打开 PWA，
// 自然过渡到新 SW，体验更稳。
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
});

// 请求拦截：先查缓存，没有再走网络（网络失败就返回缓存）
self.addEventListener('fetch', (event) => {
  // 只处理 GET
  if (event.request.method !== 'GET') return;
  // 只处理同源
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((resp) => {
          // 成功拿到网络数据 → 更新缓存
          if (resp && resp.status === 200) {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return resp;
        })
        .catch(() => cached); // 离线就用缓存

      // Stale-while-revalidate：缓存有就立即返回，同时后台更新
      return cached || networkFetch;
    })
  );
});

const CACHE_NAME = 'ei-cache-v1';
const ASSETS = [
  'index.html',
  'main.js',
  'edge-impulse-standalone.js',
  'wasm_compiled.wasm',
  'manifest.json',
  'icon.png'
];

// 설치 시 파일 캐싱
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

// 네트워크 우선 순위 전략 (모델 파일 로딩 대응)
self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});
/* 마음 점프! 서비스워커 — 오프라인 지원
   index.html은 network-first(항상 최신), 나머지는 cache-first */
const CACHE = "mind-jump-v8";
const ASSETS = [
  "./", "./index.html", "./teacher.html", "./manifest.json",
  "./icon-192.png", "./icon-512.png", "./hero.png",
  "./bg/bg1.jpg", "./bg/bg2.jpg", "./bg/bg3.jpg", "./bg/bg4.jpg",
  "./hero/atlas.png"
];

self.addEventListener("install", e => {
  // 자산 하나가 실패해도 설치가 통째로 실패하지 않도록 개별 캐싱(best-effort)
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(ASSETS.map(a => c.add(a).catch(() => {}))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  // 페이지 이동(index.html)은 항상 네트워크 우선 → 업데이트 즉시 반영, 오프라인이면 캐시
  if (e.request.mode === "navigate"){
    e.respondWith(
      fetch(e.request)
        .then(r => {
          // 정상(200) 응답만 캐시 — 오류·캡티브포털·리다이렉트 응답이 오프라인 폴백을 오염시키지 않게
          if (r.ok && r.type === "basic"){ const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); }
          return r;
        })
        .catch(() => caches.match(e.request).then(hit => hit || caches.match("./index.html")))
    );
    return;
  }
  // 그 외(아이콘·폰트 등)는 캐시 우선, 없으면 받아서 캐시
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
      if (r.ok || r.type === "opaque"){ const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); }
      return r;
    }))
  );
});

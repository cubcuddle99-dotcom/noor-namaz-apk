// নূর অ্যাপের অফলাইন ক্যাশ।
// index.html বদলালে ভার্সন বাড়ানো লাগবে না (পেজ আগে নেটওয়ার্ক থেকে আসে এবং প্রতিবার ক্যাশ নতুন হয়)।
// শুধু আইকন, manifest বা adhan.mp3 বদলালে নিচের ভার্সন সংখ্যা বাড়ান (v6 -> v7)।
const CACHE = 'noor-v9';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
const OPTIONAL = ['./adhan.mp3']; // ফাইল না থাকলেও ইনস্টল আটকাবে না

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      // cache:'reload' = ব্রাউজারের পুরোনো কপি এড়িয়ে সরাসরি সার্ভার থেকে নতুন ফাইল আনে
      .then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))
        .then(() => Promise.all(OPTIONAL.map(u => c.add(u).catch(() => {})))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// অডিও ফাইলে ফোন "Range" অনুরোধ পাঠায়, তাই ক্যাশ থেকেও আংশিক উত্তর দিতে হয়
async function serveAudio(req) {
  let hit = await caches.match(req.url);
  if (!hit) {
    const net = await fetch(req.url);
    if (!net.ok) return net;
    const c = await caches.open(CACHE);
    await c.put(req.url, net.clone());
    hit = net;
  }
  const range = req.headers.get('range');
  if (!range) return hit;
  const buf = await hit.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  const start = m && m[1] ? +m[1] : 0;
  const end = m && m[2] ? Math.min(+m[2], buf.byteLength - 1) : buf.byteLength - 1;
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': hit.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': `bytes ${start}-${end}/${buf.byteLength}`,
      'Content-Length': String(end - start + 1)
    }
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // শহর খোঁজার API: ক্যাশ নয়, শুধু অনলাইনে কাজ করবে
  if (url.hostname.includes('nominatim.openstreetmap.org')) return;

  // আযানের অডিও
  if (url.origin === location.origin && /\.(mp3|ogg|m4a|wav)$/i.test(url.pathname)) {
    e.respondWith(serveAudio(req).catch(() => Response.error()));
    return;
  }

  // পেজ: আগে নেটওয়ার্ক (নতুন ভার্সন পেতে), না পেলে ক্যাশ
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const res = await fetch(req, { cache: 'no-cache' }); // হোস্টের/ব্রাউজারের পুরোনো কপি এড়িয়ে সবসময় সার্ভারকে জিজ্ঞেস করে
        if (res && res.ok && !res.redirected) {
          // গুরুত্বপূর্ণ: রেসপন্স ব্রাউজারকে দেওয়ার আগেই ক্লোন করতে হয়, নইলে ক্যাশ আপডেট নীরবে ব্যর্থ হয়
          const copy = res.clone();
          e.waitUntil(caches.open(CACHE).then(c => c.put('./index.html', copy)).catch(() => {}));
        }
        return res;
      } catch (err) {
        return (await caches.match('./index.html')) || (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }

  // বাকি সব (ফন্ট, ছবি ইত্যাদি): আগে ক্যাশ, না থাকলে নেটওয়ার্ক থেকে এনে ক্যাশে রাখো
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => hit))
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(cs => cs.length ? cs[0].focus() : self.clients.openWindow('./')));
});

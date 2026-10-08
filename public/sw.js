/* The store's service worker (docs/13 "PWA", ADR 0007). Served from each store's own origin, so
   its caches belong to that store only. Pages: network first (3 s), then the cached copy, then
   the offline page. Static files and images: cache first. Cart, checkout, account, wishlist,
   affiliate, admin and API calls: always the network, never cached (personal data). */

const VERSION = 'v4'
const SHELL = `shell-${VERSION}`
const PAGES = `pages-${VERSION}`
const ASSETS = `assets-${VERSION}`
const IMAGES = `images-${VERSION}`
const OFFLINE = '/offline'
const MAX_PAGES = 50
const MAX_IMAGES = 300

const PRIVATE = [
  '/api/',
  '/admin',
  '/cart',
  '/checkout',
  '/account',
  '/wishlist',
  '/affiliate',
  '/review/',
  '/r/',
  '/u/',
  '/unsubscribe',
  '/t/',
  '/preview',
]

// The offline page and the script and style files it needs, so it renders with no connection
async function saveShell() {
  const response = await fetch(new Request(OFFLINE, { cache: 'reload' }))
  if (!response.ok) return
  const html = await response.clone().text()
  await (await caches.open(SHELL)).put(OFFLINE, response)
  const files = [...new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) ?? [])]
  const assets = await caches.open(ASSETS)
  await Promise.all(files.map((file) => assets.add(file).catch(() => undefined)))
}

self.addEventListener('install', (event) => {
  event.waitUntil(saveShell().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  const keep = [SHELL, PAGES, ASSETS, IMAGES]
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => !keep.includes(n)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  )
})

async function trim(name, max) {
  const cache = await caches.open(name)
  const keys = await cache.keys()
  for (const key of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(key)
}

async function cacheFirst(request, name, max) {
  // Hashed files and images don't change; a Vary header (colour scheme hints) mustn't miss them
  const cached = await caches.match(request, { ignoreVary: true })
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(name)
    await cache.put(request, response.clone())
    if (max) trim(name, max)
  }
  return response
}

async function networkFirst(request) {
  const cache = await caches.open(PAGES)
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
    ])
    if (response.ok && response.type === 'basic') {
      await cache.put(request, response.clone())
      trim(PAGES, MAX_PAGES)
    }
    return response
  } catch {
    const saved = await cache.match(request)
    if (saved) return saved
    const url = new URL(request.url)
    // The offline page at its own address, so the app's router recognises it; Try again returns
    if (url.pathname !== OFFLINE) {
      return Response.redirect(`${OFFLINE}?from=${encodeURIComponent(url.pathname + url.search)}`, 302)
    }
    return (
      (await caches.match(OFFLINE)) ||
      new Response('You are offline.', { status: 503, headers: { 'Content-Type': 'text/plain' } })
    )
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, ASSETS))
    return
  }
  if (request.destination === 'image' || url.pathname.startsWith('/api/media/file/')) {
    event.respondWith(cacheFirst(request, IMAGES, MAX_IMAGES))
    return
  }
  if (PRIVATE.some((path) => url.pathname === path.replace(/\/$/, '') || url.pathname.startsWith(path))) {
    return
  }
  // Full page loads only; the app's own data requests (RSC) always use the network
  if (request.mode === 'navigate') event.respondWith(networkFirst(request))
})

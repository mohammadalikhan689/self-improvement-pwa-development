const CACHE_NAME = 'small-steps-v4'
const SUPABASE_ORIGIN = 'supabase.co'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  const isSupabaseRequest = url.hostname === SUPABASE_ORIGIN || url.hostname.endsWith(`.${SUPABASE_ORIGIN}`)
  const isPage = request.mode === 'navigate'

  if (isSupabaseRequest) {
    event.respondWith(fetch(request, { cache: 'no-store' }))
    return
  }

  if (isPage) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() => caches.match(request)),
    )
  }
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

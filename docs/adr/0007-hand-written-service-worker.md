# ADR 0007: A small hand-written service worker instead of `@serwist/next`

- Status: **proposed** (9 October 2026), built so the store works offline; mudit to confirm.
  Reversible: the caching rules live in one file and move to Serwist unchanged if wanted.
- Context: docs/02 names Serwist (`@serwist/next`) for the PWA. `@serwist/next` builds the
  worker through a webpack plugin, and this app builds with Turbopack (Next 16's default for
  `next dev` and `next build`). Using it would mean building with `--webpack`, a slower build for
  the whole app, or Serwist's newer Turbopack package, a second new dependency still settling.
- What docs/13 asks of the worker is small: keep the shell and the offline page, NetworkFirst
  for pages with a 3-second timeout, CacheFirst for static assets and images, and never cache
  cart, checkout, account, wishlist, affiliate or API calls.
- Decision: `public/sw.js`, about 100 lines of plain JavaScript with exactly those rules, served
  as a static file on each store's own origin (so caches never mix between stores, docs/13), and
  registered from the storefront layout in production only. The per-store manifest and icons are
  route handlers. No new dependency.
- Consequences: no precache manifest of every build file (the shell fills the cache as it is
  used, which is what the "recently viewed" offline page needs anyway); the worker's cache name
  is bumped by hand when its rules change. docs/02 and docs/13 updated.

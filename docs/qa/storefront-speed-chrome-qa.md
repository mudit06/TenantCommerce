# Storefront speed check (Claude in Chrome)

An end-to-end run over the storefront that measures **response times only**: how fast each page
answers, paints and becomes usable, first visit and repeat visit, plus moving between pages, search
suggestions and add to cart. It changes nothing except one cart line. Paste the report it prints
back into Claude Code to compare runs (docs/13 "As built" and "Admin" list what to expect).

## Before you start

1. **Use a production build.** `next dev` is 10 to 15 times slower and compiles each page on its
   first visit, so its numbers mean nothing (docs/13). In a terminal, from the project folder:

   ```
   pnpm build
   pnpm start
   ```

   with `.env` pointing at the QA database (`tenantecom_qa`). Wait for `Ready`.
2. **The store must be Active.** A production build shows draft stores as "coming soon". Home
   Orbit is a draft in the QA data: set it Active in the platform panel (All vendors, Home Orbit,
   Store status), or run against `http://demo-sanitary.localhost:3000` instead.
3. Open Chrome with the Claude extension, in a normal window with no other heavy tabs. Close
   DevTools (it slows pages down).

## The prompt to paste into Claude in Chrome

Copy everything in the box below. Change `STORE` first if you test another store.

````
Run a storefront speed check. STORE = http://home-orbit.localhost:3000

Rules:
- Only measure. Do not sign in, check out, or fill any form except where a step says so.
- Use the JavaScript tool for every measurement, exactly as given below. Do not estimate times from
  screenshots. The scripts are async: run each one as `await <script>` (put `await ` in front of
  it), or you get `{}` back.
- This check is for a production build. If you see the Next.js dev overlay, `next-devtools` or
  `/_next/webpack-hmr` / `turbopack` hot-reload requests, stop and say "dev build detected" unless
  I told you to run it anyway; then label the report "DEV BUILD, not a speed test".
- If a page shows an error, "coming soon", or a blank screen, record it in Notes, mark the row FAIL
  and carry on with the next page.
- At the end print ONLY the report in the format given in step 7, inside one code block.

STEP 1. Open a new tab at STORE + "/". Wait until the page has finished loading. Run this and keep
the result as LINKS:

(() => {
  const abs = (a) => new URL(a.getAttribute('href'), location.href)
  const same = [...document.querySelectorAll('a[href]')].map(abs).filter((u) => u.origin === location.origin)
  const first = (re) => same.find((u) => re.test(u.pathname))?.pathname ?? null
  return {
    category: first(/^\/c\/[^/]+$/),
    subcategory: first(/^\/c\/[^/]+\/[^/]+$/),
    product: first(/^\/products\/[^/]+$/),
    page: first(/^\/pages\/[^/]+$/),
  }
})()

If category or product is null, open STORE + "/c" and take the first /c/... link and, from that
category page, the first /products/... link.

STEP 2. The page list. Use these paths (skip a row whose path you could not find, and say so):
  P1 Home                 /
  P2 All categories       /c
  P3 Category             LINKS.category
  P4 Sub-category         LINKS.subcategory
  P5 Category, sorted     LINKS.category + "?sort=price-asc"
  P6 Product              LINKS.product
  P7 Search               /search?q= + a word from P6's product name (its h1), for example
                          "handle"; not a word from an offer banner
  P8 Offers               /offers
  P9 CMS page             LINKS.page
  P10 Contact             /contact
  P11 Cart (empty)        /cart
  P12 Not found           /this-page-does-not-exist-qa

STEP 3. For EACH page in the list, do this:
  a) Navigate the tab to STORE + path (a full page load, not a click). Wait for the load to finish
     and 1 more second. Run the MEASURE script below. This is the FIRST visit.
  b) Reload the page 3 times. After each reload wait for the load to finish and 1 more second,
     then run MEASURE again. These are REPEAT visits.
  Keep all 4 results for the report.

MEASURE script:

(async () => {
  const nav = performance.getEntriesByType('navigation')[0]
  const paint = (name) => performance.getEntriesByName(name)[0]?.startTime ?? null
  const observe = (type) => new Promise((resolve) => {
    const seen = []
    try {
      new PerformanceObserver((list) => seen.push(...list.getEntries())).observe({ type, buffered: true })
    } catch { resolve([]) }
    setTimeout(() => resolve(seen), 400)
  })
  const [lcp, shifts, longTasks] = await Promise.all([
    observe('largest-contentful-paint'), observe('layout-shift'), observe('longtask'),
  ])
  const res = performance.getEntriesByType('resource')
  const kb = (n) => Math.round(n / 1024)
  const sum = (list, key) => list.reduce((s, r) => s + (r[key] || 0), 0)
  const js = res.filter((r) => r.initiatorType === 'script' || /\.js(\?|$)/.test(r.name))
  const img = res.filter((r) => r.initiatorType === 'img' || /\.(webp|avif|png|jpe?g)(\?|$)/.test(r.name))
  const round = (n) => (n == null ? null : Math.round(n))
  return {
    url: location.pathname + location.search,
    status: nav.responseStatus ?? null,
    title: document.title,
    h1: document.querySelector('h1')?.textContent?.trim().slice(0, 60) ?? null,
    serverMs: round(nav.responseStart - nav.requestStart),
    ttfbMs: round(nav.responseStart - nav.startTime),
    htmlDoneMs: round(nav.responseEnd - nav.startTime),
    fcpMs: round(paint('first-contentful-paint')),
    lcpMs: round(lcp.at(-1)?.startTime),
    lcpElement: lcp.at(-1)?.element?.tagName ?? null,
    domReadyMs: round(nav.domContentLoadedEventEnd - nav.startTime),
    loadMs: round(nav.loadEventEnd - nav.startTime),
    cls: Math.round(shifts.filter((s) => !s.hadRecentInput).reduce((s, e) => s + e.value, 0) * 1000) / 1000,
    longTasks: longTasks.length,
    longTaskMs: round(sum(longTasks, 'duration')),
    htmlKB: kb(nav.encodedBodySize),
    htmlRawKB: kb(nav.decodedBodySize),
    requests: res.length + 1,
    totalKB: kb(nav.transferSize + sum(res, 'transferSize')),
    jsKB: kb(sum(js, 'encodedBodySize')),
    jsFiles: js.length,
    images: img.length,
    imagesFromCache: img.filter((r) => r.transferSize === 0).length,
    slowest: [...res].sort((a, b) => b.duration - a.duration).slice(0, 3)
      .map((r) => `${Math.round(r.duration)}ms ${r.name.replace(location.origin, '').slice(0, 70)}`),
  }
})()

STEP 4. Moving between pages without a full reload (what a shopper feels after the first page).
Run the script below 3 times from the home page with TARGET = LINKS.category, doing a fresh full
load of STORE + "/" before each run. Then run it 3 times from LINKS.category with
TARGET = LINKS.product, doing a fresh full load of the category page before each run.

(async () => {
  const TARGET = 'PUT_PATH_HERE'
  const link = [...document.querySelectorAll('a[href]')].find((a) => a.getAttribute('href') === TARGET)
  if (!link) return { error: 'no link to ' + TARGET + ' on this page' }
  const from = location.pathname
  const before = document.querySelector('h1')?.textContent
  const start = performance.now()
  link.click()
  const until = (test) => new Promise((resolve) => {
    const tick = () => (test() ? resolve(Math.round(performance.now() - start))
      : performance.now() - start > 15000 ? resolve(null) : requestAnimationFrame(tick))
    tick()
  })
  const urlMs = await until(() => location.pathname === TARGET)
  const contentMs = await until(() => document.querySelector('h1')?.textContent !== before)
  return { from, to: TARGET, urlChangedMs: urlMs, newHeadingMs: contentMs }
})()

STEP 5. Search suggestions (typing in the search box). On any store page run:

(async () => {
  const words = ['st', 'ste', 'stee', 'steel', 'handle', 'holder']
  const out = []
  for (const q of words) {
    const t = performance.now()
    const r = await fetch('/search/suggest?q=' + encodeURIComponent(q), { cache: 'no-store' })
    await r.text()
    out.push({ q, status: r.status, ms: Math.round(performance.now() - t) })
  }
  return out
})()

STEP 6. Add to cart. Open STORE + LINKS.product and wait for the load. Find the main "Add to cart"
(or "Add to bag") button of the product (not one inside a related-products card). If the product
asks for a finish or size first, choose the first available option. Then run this script, changing
BUTTON_TEXT to the button's exact text:

(async () => {
  const BUTTON_TEXT = 'Add to cart'
  const button = [...document.querySelectorAll('main button')].find((b) => b.textContent.trim() === BUTTON_TEXT && !b.disabled)
  if (!button) return { error: 'button not found or disabled' }
  const badge = () => document.querySelector('header a[href="/cart"]')?.getAttribute('aria-label') ?? 'none'
  const added = () => (document.body.innerText.match(/Added to your cart/g) ?? []).length
  const before = badge()
  const addedBefore = added()
  const t0 = performance.now()
  button.click()
  const ms = await new Promise((resolve) => {
    const tick = () => (badge() !== before || added() > addedBefore
      ? resolve(Math.round(performance.now() - t0))
      : performance.now() - t0 > 15000 ? resolve(null) : setTimeout(tick, 25))
    tick()
  })
  const message = [...document.querySelectorAll('main [role="status"], main [role="alert"], main p')]
    .map((el) => el.textContent.trim()).find((t) => /cart|stock|pincode|choose|select/i.test(t)) ?? null
  return { addToCartMs: ms, cartBefore: before, cartAfter: badge(), message }
})()

If it returns null or an error, describe what you saw on screen in the report. Then open
STORE + "/cart" (full load) and run MEASURE once more as row P13 "Cart (1 item)".

STEP 7. Print the report exactly in this format, in one code block, nothing outside it:

STOREFRONT SPEED REPORT
Store: <STORE>   Date/time: <now>   Browser: <short user agent>
Build: production (assumed)   Store status seen: <active / coming soon / error>

PAGES (ms; "first" = first visit, "rep" = median of the 3 repeat visits)
| # | Page | Path | HTTP | Server first | Server rep | TTFB rep | FCP rep | LCP first | LCP rep | Load rep | CLS | HTML KB | Total KB first | Requests | JS KB | Images (cached on rep) | Long tasks rep | Verdict |
(one row per page P1..P13)

Verdict rules (use repeat-visit numbers):
  PASS = Server rep < 150 (P1, P2, P6, P8, P9, P10) or < 400 (all others), LCP rep < 2500, CLS < 0.1
  SLOW = a time between that limit and 3x the limit
  FAIL = HTTP not 200 (P12 must be 404), an error or blank page, or a time over 3x the limit

SLOWEST RESOURCES (first visit, from "slowest")
P1: ...
(one line per page)

PAGE TO PAGE (client navigation, ms)
Home -> Category: url <a, b, c>  heading <a, b, c>
Category -> Product: url <a, b, c>  heading <a, b, c>

SEARCH SUGGEST (ms per keystroke)
st <ms, status> | ste ... | ...

ADD TO CART
addToCartMs: <ms>  cart badge: <before> -> <after>   Notes: <...>

RAW
<the full JSON of every MEASURE result and every STEP 4, 5 and 6 result, one per line>

NOTES
<anything odd: errors on the page, images that never loaded, layout jumping, "coming soon", slow
first visits after a server restart, etc.>
````

## Reading the results

- **Server** (`responseStart - requestStart`) is the time the app took to answer. Pages kept in
  the cache (home, all categories, product, offers, CMS pages, contact) should answer in tens of
  milliseconds on a repeat visit; their very first visit after `pnpm start` builds the page and
  takes longer. Category, sorted category and search are rendered for each visit.
- **LCP** is when the main image or heading appears. Locally it is mostly the photo download
  (photos come from the app at `/api/media/file/...`; in production they come from the CDN when
  `MEDIA_PUBLIC_URL` is set, docs/19).
- **Images (cached on rep)** should equal the image count on repeat visits: photos are sent with a
  one-day cache header. If not, that header is missing.
- **Links prefetch only on hover, touch or focus** (docs/13). A burst of `?_rsc` requests right
  after a page loads, without the pointer over anything, means a link still uses `next/link`.
- Run it twice (once right after `pnpm start`, once again) and paste both reports into Claude Code.

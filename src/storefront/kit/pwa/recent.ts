// Recently viewed products on this device (docs/screens storefront `st-offline`): what the offline
// page lists, since the service worker keeps those pages. Only a product's public facts.

export type RecentProduct = {
  path: string
  title: string
  price: string | null
  image: string | null
}

const KEY = 'te_recent'
const MAX = 12

export function readRecent(): RecentProduct[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown
    return Array.isArray(list) ? (list as RecentProduct[]).slice(0, MAX) : []
  } catch {
    return []
  }
}

export function rememberRecent(item: RecentProduct) {
  try {
    const next = [item, ...readRecent().filter((r) => r.path !== item.path)].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Private mode or storage full: nothing to remember
  }
}

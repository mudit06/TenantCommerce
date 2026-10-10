// Store search ranking (docs/screens storefront `st-search`): model numbers and SKUs first, even
// typed partly ("1120"), then names and keywords, then small typos ("basin mixr"). Pure, unit
// tested, run in memory over the store's cached product list; Atlas Search replaces it when
// catalogues grow past a few thousand products (docs/12).

export type Searchable = {
  title: string
  modelNumber?: string | null
  searchKeywords?: string | null
}

/** Lower case, letters and digits only: "AV-BM 1120" and "avbm1120" compare equal. */
const compact = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '')
const words = (text: string) => text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)

/** Edit distance where swapping two neighbouring letters counts once ("handel"), stopping early once it passes `max`. */
export function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let before: number[] = []
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      row[j] = Math.min(prev[j]! + 1, row[j - 1]! + 1, prev[j - 1]! + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        row[j] = Math.min(row[j]!, before[j - 2]! + 1)
      best = Math.min(best, row[j]!)
    }
    if (best > max) return max + 1
    before = prev
    prev = row
  }
  return prev[b.length]!
}

const typoAllowance = (word: string) => (word.length >= 7 ? 2 : word.length >= 4 ? 1 : 0)

/** How well a product matches the query; 0 means not at all. */
export function searchScore(product: Searchable, query: string): number {
  const q = compact(query)
  if (q.length < 2) return 0
  const model = compact(product.modelNumber ?? '')
  if (model) {
    if (model === q) return 100
    if (model.startsWith(q)) return 90
    if (model.includes(q)) return 80
  }
  const tokens = words(query)
  const titleWords = words(product.title)
  const keywordWords = words(product.searchKeywords ?? '')
  const all = [...titleWords, ...keywordWords]
  if (tokens.length && tokens.every((t) => titleWords.some((w) => w.startsWith(t)))) return 60
  if (compact(product.title).includes(q)) return 50
  if (tokens.length && tokens.every((t) => all.some((w) => w.startsWith(t)))) return 40
  // Small typos: every word of the query is close to a word of the name or keywords
  if (
    tokens.length &&
    tokens.every((t) => {
      const allowed = typoAllowance(t)
      return all.some(
        (w) => w.startsWith(t) || (allowed > 0 && editDistance(t, w, allowed) <= allowed),
      )
    })
  )
    return 20
  return 0
}

/** Products matching the query, best first; ties keep the list's own order. */
export function rankSearch<T extends Searchable>(products: readonly T[], query: string): T[] {
  return products
    .map((product, index) => ({ product, index, score: searchScore(product, query) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((row) => row.product)
}

/** Categories whose name matches the query (start of a word, or a small typo). */
export function matchCategories<T extends { name: string }>(categories: readonly T[], query: string) {
  const tokens = words(query)
  if (!tokens.length) return []
  return categories.filter((category) => {
    const name = words(category.name)
    return tokens.every((t) =>
      name.some((w) => w.startsWith(t) || editDistance(t, w, typoAllowance(t)) <= typoAllowance(t)),
    )
  })
}

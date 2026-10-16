import type { Product } from '@/payload-types'

/** A variant's own price and MRP (null: the product's), and whether it can be bought now. */
export type VariantPrice = { priceMinor: number | null; mrpMinor: number | null; inStock: boolean }

/**
 * The price a card shows (docs/screens storefront: "the card shows a price range or from ₹X"):
 * the lowest of the finishes in stock (of all of them when none is), with that finish's MRP, as
 * the product page prices each finish (`buyOptionsFor`). Without variants, the product's own.
 */
export function cardPrice(
  doc: Pick<Product, 'price' | 'compareAtPrice'>,
  variants: VariantPrice[],
): Pick<Product, 'price' | 'compareAtPrice'> & { priceRange: boolean } {
  const base = doc.price?.amountMinor
  if (!base || variants.length === 0) {
    return { price: doc.price, compareAtPrice: doc.compareAtPrice, priceRange: false }
  }
  const rows = variants.map((v) => ({
    priceMinor: v.priceMinor ?? base,
    mrpMinor: v.mrpMinor ?? doc.compareAtPrice?.amountMinor ?? null,
    inStock: v.inStock,
  }))
  const pool = rows.some((row) => row.inStock) ? rows.filter((row) => row.inStock) : rows
  const lowest = pool.reduce((min, row) => (row.priceMinor < min.priceMinor ? row : min))
  return {
    price: { ...doc.price, amountMinor: lowest.priceMinor },
    compareAtPrice:
      lowest.mrpMinor === null
        ? doc.compareAtPrice
        : { ...doc.compareAtPrice, amountMinor: lowest.mrpMinor },
    priceRange: new Set(rows.map((row) => row.priceMinor)).size > 1,
  }
}

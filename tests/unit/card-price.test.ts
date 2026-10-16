import { describe, expect, it } from 'vitest'

import { cardPrice } from '@/lib/data/cardPrice'

const product = {
  price: { amountMinor: 149900, currency: 'INR' as const },
  compareAtPrice: { amountMinor: 199900, currency: 'INR' as const },
}

describe('the price a product card shows (P2-03-005, P2-03-006)', () => {
  it('is the product’s own price without finishes', () => {
    expect(cardPrice(product, [])).toEqual({ ...product, priceRange: false })
  })

  it('follows a finish’s own price, as the product page does', () => {
    const result = cardPrice(product, [
      { priceMinor: 129900, mrpMinor: null, inStock: true },
      { priceMinor: 169900, mrpMinor: null, inStock: false },
    ])
    expect(result.price?.amountMinor).toBe(129900)
    expect(result.compareAtPrice?.amountMinor).toBe(199900)
    expect(result.priceRange).toBe(true)
  })

  it('is the lowest finish in stock, with that finish’s MRP', () => {
    const result = cardPrice(product, [
      { priceMinor: 99900, mrpMinor: 120000, inStock: false },
      { priceMinor: null, mrpMinor: null, inStock: true },
      { priceMinor: 159900, mrpMinor: 180000, inStock: true },
    ])
    expect(result.price?.amountMinor).toBe(149900)
    expect(result.compareAtPrice?.amountMinor).toBe(199900)
    expect(result.priceRange).toBe(true)
  })

  it('is the lowest of all finishes when none is in stock', () => {
    const result = cardPrice(product, [
      { priceMinor: 169900, mrpMinor: null, inStock: false },
      { priceMinor: 159900, mrpMinor: 180000, inStock: false },
    ])
    expect(result.price?.amountMinor).toBe(159900)
    expect(result.compareAtPrice?.amountMinor).toBe(180000)
  })

  it('shows no range when every finish costs the same', () => {
    const result = cardPrice(product, [
      { priceMinor: null, mrpMinor: null, inStock: true },
      { priceMinor: 149900, mrpMinor: null, inStock: true },
    ])
    expect(result.priceRange).toBe(false)
  })

  it('keeps "price on request" products without a price', () => {
    const result = cardPrice({ price: undefined, compareAtPrice: undefined }, [
      { priceMinor: 129900, mrpMinor: null, inStock: true },
    ])
    expect(result.price).toBeUndefined()
    expect(result.priceRange).toBe(false)
  })
})

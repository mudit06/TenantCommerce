import { describe, expect, it } from 'vitest'

import { distanceKm, rankDealers, type DealerPoint } from '@/modules/dealers/rules'

// The dealer locator's order (docs/screens storefront `st-dealers`)

const dealer = (over: Partial<DealerPoint>): DealerPoint => ({
  id: over.name ?? 'd',
  name: 'Dealer',
  type: 'dealer',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411045',
  address: '',
  location: null,
  ...over,
})

// Baner, Aundh and Hadapsar in Pune; Andheri in Mumbai
const baner = dealer({ name: 'Shree Sanitation', pincode: '411045', location: [73.7868, 18.559] })
const aundh = dealer({ name: 'Aqua Bath Studio', pincode: '411007', location: [73.8077, 18.5582] })
const hadapsar = dealer({
  name: 'Kumar Bath House',
  pincode: '411028',
  location: [73.9259, 18.5089],
})
const andheri = dealer({
  name: 'Mumbai Tiles',
  city: 'Mumbai',
  pincode: '400053',
  location: [72.8361, 19.1197],
})
const noMap = dealer({ name: 'Baner Hardware', pincode: '411045' })
const all = [andheri, hadapsar, aundh, baner, noMap]

describe('dealer locator', () => {
  it('measures km between two points', () => {
    expect(distanceKm(baner.location!, andheri.location!)).toBeGreaterThan(110)
    expect(distanceKm(baner.location!, andheri.location!)).toBeLessThan(130)
  })

  it('orders by distance from the phone’s location', () => {
    const { dealers } = rankDealers(all, { lat: 18.56, lng: 73.79 })
    expect(dealers.map((d) => d.name)).toEqual([
      'Shree Sanitation',
      'Aqua Bath Studio',
      'Kumar Bath House',
      'Mumbai Tiles',
      'Baner Hardware',
    ])
    expect(dealers[0]!.distanceKm).toBeLessThan(1)
    expect(dealers[0]!.approximate).toBe(false)
  })

  it('orders by a pincode, measuring from the dealers in it', () => {
    const { dealers, matched } = rankDealers(all, { q: '411045' })
    expect(matched).toBe(true)
    expect(dealers[0]!.name).toBe('Shree Sanitation')
    expect(dealers.at(-1)!.name).toBe('Baner Hardware')
    expect(dealers.find((d) => d.name === 'Mumbai Tiles')!.distanceKm).toBeGreaterThan(100)
    expect(dealers[0]!.approximate).toBe(true)
    // A pincode with no dealer in its district still lists everyone, unmatched
    expect(rankDealers(all, { q: '560001' }).matched).toBe(false)
  })

  it('finds a city or name, or lists everyone when nothing matches', () => {
    expect(rankDealers(all, { q: 'mumbai' }).dealers.map((d) => d.name)).toEqual(['Mumbai Tiles'])
    const none = rankDealers(all, { q: 'Nagpur' })
    expect(none.matched).toBe(false)
    expect(none.dealers).toHaveLength(5)
  })
})

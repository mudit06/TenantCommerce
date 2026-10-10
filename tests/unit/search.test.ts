import { describe, expect, it } from 'vitest'

import { editDistance, matchCategories, rankSearch, searchScore } from '@/lib/search'

const products = [
  { title: 'Aria tall basin mixer', modelNumber: 'AV-BM-1125' },
  { title: 'Aria single-lever basin mixer', modelNumber: 'AV-BM-1120' },
  { title: '35 mm cartridge for Aria', modelNumber: 'AV-SP-0035', searchKeywords: 'fits 1120' },
  { title: 'Nimbus wall-hung WC', modelNumber: 'AV-WH-2041', searchKeywords: 'toilet, commode' },
]

describe('store search (st-search)', () => {
  it('puts model numbers first, even typed partly or without dashes', () => {
    expect(rankSearch(products, '1120').map((p) => p.modelNumber)).toEqual([
      'AV-BM-1120',
      'AV-SP-0035',
    ])
    expect(searchScore(products[1]!, 'avbm1120')).toBe(100)
    expect(searchScore(products[1]!, 'AV-BM')).toBe(90)
  })

  it('matches names and keywords, and forgives small typos', () => {
    expect(rankSearch(products, 'basin mixer')).toHaveLength(2)
    expect(rankSearch(products, 'basin mixr').map((p) => p.modelNumber)).toEqual([
      'AV-BM-1125',
      'AV-BM-1120',
    ])
    expect(rankSearch(products, 'commode').map((p) => p.modelNumber)).toEqual(['AV-WH-2041'])
    expect(rankSearch(products, 'xyz')).toEqual([])
    expect(rankSearch(products, 'a')).toEqual([])
  })

  it('measures edit distance and stops early', () => {
    expect(editDistance('mixr', 'mixer')).toBe(1)
    expect(editDistance('handel', 'handle')).toBe(1)
    expect(editDistance('kitten', 'sitting')).toBe(3)
    expect(editDistance('abc', 'abcdefgh', 2)).toBe(3)
  })

  it('finds categories by the start of a word or a small typo', () => {
    const categories = [{ name: 'Basin mixers' }, { name: 'Towel rings' }, { name: 'Key hangers' }]
    expect(matchCategories(categories, 'towel')).toEqual([{ name: 'Towel rings' }])
    expect(matchCategories(categories, 'hangrs')).toEqual([{ name: 'Key hangers' }])
    expect(matchCategories(categories, '')).toEqual([])
  })
})

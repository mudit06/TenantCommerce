import { describe, expect, it } from 'vitest'

import { allow } from '@/lib/rate-limit'
import {
  combinations,
  productAttributeProblems,
  variantAxes,
  variantOptionProblems,
  variantSku,
  variantTitle,
  type Attribute,
} from '@/modules/catalog/services/productAttributes'
import {
  applyExtraFilters,
  applyFilters,
  extraFilterCount,
  extraFilters,
  paginate,
  selectedFilters,
  sortKey,
  sortProducts,
  toggleQuery,
} from '@/storefront/kit/listing/listing'

const SET: Attribute[] = [
  {
    label: 'Finish',
    code: 'finish',
    type: 'color',
    isFilterable: true,
    isVariantAxis: true,
    options: [
      { label: 'Antique', value: 'antique' },
      { label: 'Rose gold', value: 'rose-gold' },
      { label: 'Chrome', value: 'chrome' },
    ],
  },
  {
    label: 'Size',
    code: 'size',
    type: 'select',
    isFilterable: true,
    isVariantAxis: true,
    options: [
      { label: '8 inch', value: '8-inch' },
      { label: '10 inch', value: '10-inch' },
    ],
  },
  {
    label: 'Material',
    code: 'material',
    type: 'select',
    isFilterable: true,
    isRequired: true,
    options: [
      { label: 'Stainless steel', value: 'ss' },
      { label: 'Brass', value: 'brass' },
    ],
  },
  { label: 'Weight', code: 'weight', type: 'number', unit: 'g' },
  { label: 'Rust proof', code: 'rust_proof', type: 'boolean' },
]

describe('product specifications', () => {
  it('accepts values that match the attribute set', () => {
    expect(
      productAttributeProblems(
        SET,
        { finish: ['antique'], material: 'ss', weight: 420, rust_proof: true },
        { requireRequired: true },
      ),
    ).toEqual([])
  })

  it('names unknown fields, wrong options and missing required values', () => {
    expect(
      productAttributeProblems(
        SET,
        { colour: 'red', finish: ['gold'], material: 'iron', weight: '420' },
        { requireRequired: true },
      ),
    ).toEqual([
      '“colour” is not a field of this category’s attribute set',
      'Finish: “gold” is not one of its options',
      'Material: pick one of its options',
      'Weight must be a number',
    ])
    expect(productAttributeProblems(SET, {}, { requireRequired: true })).toEqual([
      'Material is required',
    ])
    expect(productAttributeProblems(SET, {})).toEqual([])
  })
})

describe('variants from offered options', () => {
  const values = { finish: ['antique', 'rose-gold'], size: ['8-inch', '10-inch'] }

  it('uses only the ticked values, and skips options with nothing ticked', () => {
    const axes = variantAxes(SET, values)
    expect(axes.map((axis) => [axis.code, axis.options.map((o) => o.value)])).toEqual([
      ['finish', ['antique', 'rose-gold']],
      ['size', ['8-inch', '10-inch']],
    ])
    expect(variantAxes(SET, { finish: ['chrome'] }).map((axis) => axis.code)).toEqual(['finish'])
    expect(variantAxes(SET, {})).toEqual([])
  })

  it('makes every combination with a readable title and SKU', () => {
    const axes = variantAxes(SET, values)
    const rows = combinations(axes)
    expect(rows).toHaveLength(4)
    expect(variantTitle(axes, rows[1]!)).toBe('Antique · 10 inch')
    expect(variantSku('HOPH-504', axes, rows[3]!)).toBe('HOPH-504-ROSE-GOLD-10-INCH')
    expect(combinations([])).toEqual([])
  })

  it('checks a variant picks one offered value per option', () => {
    const axes = variantAxes(SET, values)
    expect(variantOptionProblems(axes, { finish: 'antique', size: '8-inch' })).toEqual([])
    expect(variantOptionProblems(axes, { finish: 'chrome', size: '8-inch', colour: 'x' })).toEqual([
      'Pick a finish this product is offered in',
      '“colour” is not an option of this product',
    ])
  })
})

describe('category listing', () => {
  const products = [
    {
      id: '1',
      title: 'Beta',
      createdAt: '2026-10-01',
      attributes: { finish: ['antique', 'chrome'], material: 'ss' },
    },
    {
      id: '2',
      title: 'alpha',
      createdAt: '2026-10-03',
      attributes: { finish: ['rose-gold'], material: 'brass' },
    },
    {
      id: '3',
      title: 'Gamma 10',
      createdAt: '2026-10-02',
      attributes: { finish: ['chrome'], material: 'ss' },
    },
  ]

  it('reads filters from the URL and counts options, ignoring a filter’s own selection', () => {
    const selected = selectedFilters(SET, {
      finish: 'chrome,antique',
      material: ['ss'],
      page: '2',
      colour: 'x',
    })
    expect(selected).toEqual({ finish: ['chrome', 'antique'], material: ['ss'] })
    const { products: shown, facets } = applyFilters(products, SET, { finish: ['chrome'] })
    expect(shown.map((p) => p.id)).toEqual(['1', '3'])
    const finish = facets.find((f) => f.code === 'finish')!
    expect(finish.options.map((o) => [o.value, o.count, o.selected])).toEqual([
      ['antique', 1, false],
      ['rose-gold', 1, false],
      ['chrome', 2, true],
    ])
    // Among chrome products every one is stainless steel: a filter with one choice is hidden
    expect(facets.find((f) => f.code === 'material')).toBeUndefined()
    expect(
      applyFilters(products, SET, {})
        .facets.find((f) => f.code === 'material')!
        .options.map((o) => [o.value, o.count]),
    ).toEqual([
      ['ss', 2],
      ['brass', 1],
    ])
  })

  it('sorts, pages and toggles filter links', () => {
    expect(sortProducts(products, 'newest').map((p) => p.id)).toEqual(['2', '3', '1'])
    expect(sortProducts(products, 'name').map((p) => p.title)).toEqual([
      'alpha',
      'Beta',
      'Gamma 10',
    ])
    expect(paginate([1, 2, 3, 4, 5], 9, 2)).toEqual({
      items: [5],
      page: 3,
      from: 3,
      pages: 3,
      total: 5,
    })
    // Load more: pages 1 to 2 together
    expect(paginate([1, 2, 3, 4, 5], 2, 2, 1).items).toEqual([1, 2, 3, 4])
    expect(toggleQuery({ finish: 'chrome', page: '3' }, 'finish', 'antique')).toBe(
      '?finish=chrome%2Cantique',
    )
    expect(toggleQuery({ finish: 'chrome' }, 'finish', 'chrome')).toBe('?')
  })

  it('sorts by popularity and price, and filters by price, stock, offer and rating', () => {
    const list = [
      { id: 'a', title: 'A', createdAt: '2026-01-01', priceMinor: 50_000, available: 0 },
      {
        id: 'b',
        title: 'B',
        createdAt: '2026-01-02',
        priceMinor: 20_000,
        available: null,
        onOffer: true,
        rating: { average: 4.5, count: 3 },
      },
      { id: 'c', title: 'C', createdAt: '2026-01-03', priceMinor: null, isFeatured: true },
      { id: 'd', title: 'D', createdAt: '2026-01-04', priceMinor: 90_000, available: 4 },
    ]
    expect(sortProducts(list, 'popular').map((p) => p.id)).toEqual(['c', 'b', 'd', 'a'])
    expect(sortProducts(list, 'price-asc').map((p) => p.id)).toEqual(['b', 'a', 'd', 'c'])
    expect(sortProducts(list, 'price-desc').map((p) => p.id)).toEqual(['d', 'a', 'b', 'c'])
    expect(sortKey('price-asc')).toBe('price-asc')
    expect(sortKey('cheapest')).toBe('popular')

    const filters = extraFilters({ min: '₹300', max: '1000', stock: 'in' })
    expect(filters).toEqual({
      minRupees: 300,
      maxRupees: 1000,
      inStock: true,
      onOffer: false,
      minRating: null,
    })
    expect(applyExtraFilters(list, filters).map((p) => p.id)).toEqual(['d'])
    expect(applyExtraFilters(list, extraFilters({ offer: '1' })).map((p) => p.id)).toEqual(['b'])
    expect(applyExtraFilters(list, extraFilters({ rating: '4' })).map((p) => p.id)).toEqual(['b'])
    expect(extraFilterCount(extraFilters({ min: '100', stock: 'in', rating: '9' }))).toBe(2)
  })
})

describe('rate limit', () => {
  it('allows the limit within the window, then refuses until it passes', () => {
    const limit = { max: 2, windowMs: 1000 }
    expect(allow('k', limit, 0)).toBe(true)
    expect(allow('k', limit, 10)).toBe(true)
    expect(allow('k', limit, 20)).toBe(false)
    expect(allow('k', limit, 1500)).toBe(true)
  })
})

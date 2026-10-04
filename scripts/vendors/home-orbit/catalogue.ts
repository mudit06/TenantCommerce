/**
 * Home Orbit's catalogue (Home_Orbit_Catalogue_Second_Version.pdf, received 3 October 2026), as
 * data for `pnpm seed:home-orbit`. Photos were cropped from the PDF pages (`box` = left, top,
 * right, bottom on the page preview at 852 × 1102 px). Prices aren't in the catalogue: the store
 * launches as a catalogue with enquiries (docs/00).
 *
 * PROVISIONAL marks a model number we made up because the catalogue repeats one code for
 * different designs (STR-001, SD-001, TR-001) or gives none (shelves). Home Orbit must confirm.
 */

export type AttributeSetSeed = {
  name: string
  attributes: {
    label: string
    code: string
    type: 'text' | 'number' | 'select' | 'multiselect' | 'boolean' | 'color'
    unit?: string
    group?: string
    isFilterable?: boolean
    isVariantAxis?: boolean
    options?: { label: string; value: string; swatchHex?: string }[]
  }[]
}

export const ATTRIBUTE_SETS: AttributeSetSeed[] = [
  {
    name: 'Aldrops',
    attributes: [
      {
        label: 'Finish',
        code: 'finish',
        type: 'color',
        group: 'Options',
        isFilterable: true,
        isVariantAxis: true,
        options: [
          { label: 'Two tone', value: 'two-tone', swatchHex: '#B9B4A9' },
          { label: 'Rose gold', value: 'rose-gold', swatchHex: '#C98B6B' },
          { label: 'Brass antique', value: 'brass-antique', swatchHex: '#8C7853' },
        ],
      },
      {
        label: 'Rod length',
        code: 'rod_length',
        type: 'select',
        group: 'Options',
        isFilterable: true,
        isVariantAxis: true,
        options: [
          { label: '8 inch', value: '8-inch' },
          { label: '10 inch', value: '10-inch' },
          { label: '12 inch', value: '12-inch' },
        ],
      },
      {
        label: 'Rod thickness',
        code: 'rod_thickness',
        type: 'select',
        group: 'Options',
        isFilterable: true,
        isVariantAxis: true,
        options: [
          { label: '13 mm × 1.5 mm', value: '13x1-5-mm' },
          { label: '14 mm × 2 mm', value: '14x2-mm' },
          { label: '16 mm × 3 mm', value: '16x3-mm' },
          { label: '16 mm × 4 mm', value: '16x4-mm' },
        ],
      },
      {
        label: 'Range',
        code: 'range',
        type: 'select',
        group: 'Details',
        isFilterable: true,
        options: [
          { label: 'Laser cutting', value: 'laser-cutting' },
          { label: 'BMC cutting', value: 'bmc-cutting' },
          { label: 'Heavy range', value: 'heavy' },
          { label: 'Classic range', value: 'classic' },
        ],
      },
      MATERIAL(),
    ],
  },
  {
    name: 'Door handles',
    attributes: [
      {
        label: 'Size',
        code: 'size',
        type: 'select',
        group: 'Options',
        isFilterable: true,
        isVariantAxis: true,
        options: [
          { label: '8 inch', value: '8-inch' },
          { label: '10 inch', value: '10-inch' },
          { label: '12 inch', value: '12-inch' },
        ],
      },
      {
        label: 'Finish',
        code: 'finish',
        type: 'color',
        group: 'Options',
        isFilterable: true,
        isVariantAxis: true,
        options: [
          { label: 'Antique', value: 'antique', swatchHex: '#8C7853' },
          { label: 'Stainless steel', value: 'stainless-steel', swatchHex: '#C9CCCE' },
          { label: 'Chrome plated', value: 'chrome-plated', swatchHex: '#E4E7EA' },
          { label: 'Black matt', value: 'black-matt', swatchHex: '#2B2B2B' },
          { label: 'Rose gold', value: 'rose-gold', swatchHex: '#C98B6B' },
        ],
      },
      MATERIAL(),
    ],
  },
  { name: 'Door stoppers', attributes: [MATERIAL()] },
  { name: 'Key hangers', attributes: [MATERIAL()] },
  { name: 'Curtain brackets', attributes: [MATERIAL()] },
  {
    name: 'Bathroom accessories',
    attributes: [
      {
        label: 'Finish',
        code: 'finish',
        type: 'color',
        group: 'Options',
        isFilterable: true,
        isVariantAxis: true,
        options: [
          { label: 'Chrome', value: 'chrome', swatchHex: '#E4E7EA' },
          { label: 'Matte black', value: 'matte-black', swatchHex: '#2B2B2B' },
          { label: 'Rose gold', value: 'rose-gold', swatchHex: '#C98B6B' },
          { label: 'Gold', value: 'gold', swatchHex: '#C9A54A' },
        ],
      },
      {
        label: 'Mounting',
        code: 'mounting',
        type: 'select',
        group: 'Details',
        options: [{ label: 'Wall mounted', value: 'wall-mounted' }],
      },
      MATERIAL(),
    ],
  },
]

function MATERIAL(): AttributeSetSeed['attributes'][number] {
  return {
    label: 'Material',
    code: 'material',
    type: 'select',
    group: 'Details',
    isFilterable: true,
    options: [
      { label: 'Stainless steel', value: 'stainless-steel' },
      { label: 'Aluminium', value: 'aluminium' },
      { label: 'Brass', value: 'brass' },
    ],
  }
}

/** Category tree: [name, parent name | null, attribute set name | null, generic name for labels] */
export const CATEGORIES: {
  name: string
  parent: string | null
  set: string | null
  description: string
}[] = [
  {
    name: 'Door hardware',
    parent: null,
    set: null,
    description: 'Aldrops, pull handles, glass door handles and door stoppers in stainless steel.',
  },
  {
    name: 'Aldrops',
    parent: 'Door hardware',
    set: 'Aldrops',
    description:
      'Stainless steel aldrops in laser-cut, BMC-cut, heavy and classic designs, in 8, 10 and 12 inch rods.',
  },
  {
    name: 'Pull handles',
    parent: 'Door hardware',
    set: 'Door handles',
    description:
      'Stainless steel pull handles with laser-cut designs, in 8, 10 and 12 inch sizes and five finishes.',
  },
  {
    name: 'Glass door handles',
    parent: 'Door hardware',
    set: 'Door handles',
    description:
      'Round stainless steel glass door handles with traditional and modern cut designs.',
  },
  {
    name: 'Door stoppers',
    parent: 'Door hardware',
    set: 'Door stoppers',
    description: 'Stainless steel door stoppers for wall and floor fixing.',
  },
  {
    name: 'Home decor',
    parent: null,
    set: null,
    description: 'Key hangers and fancy curtain brackets that finish a room.',
  },
  {
    name: 'Key hangers',
    parent: 'Home decor',
    set: 'Key hangers',
    description:
      'Stainless steel and aluminium key hangers, from Welcome and Sweet Home to devotional designs.',
  },
  {
    name: 'Curtain brackets',
    parent: 'Home decor',
    set: 'Curtain brackets',
    description: 'Fancy curtain brackets with glass and acrylic finials in many colours.',
  },
  {
    name: 'Bathroom accessories',
    parent: null,
    set: 'Bathroom accessories',
    description: 'Stainless steel towel rings, towel racks, shelves, soap dishes and dispensers.',
  },
  {
    name: 'Towel rings',
    parent: 'Bathroom accessories',
    set: null,
    description: 'Stainless steel towel rings in round, square, triangle and open designs.',
  },
  {
    name: 'Towel racks',
    parent: 'Bathroom accessories',
    set: null,
    description: 'Folding stainless steel towel racks with hooks.',
  },
  {
    name: 'Bathroom shelves',
    parent: 'Bathroom accessories',
    set: null,
    description:
      'Stainless steel bathroom shelves, from strip shelves to 3 in 1 shelves with tumbler and towel rod.',
  },
  {
    name: 'Soap dishes and dispensers',
    parent: 'Bathroom accessories',
    set: null,
    description: 'Soap dishes, tumbler holders and wall-mounted liquid soap dispensers.',
  },
]

export type ProductSeed = {
  model: string
  title: string
  category: string
  genericName: string
  page: number
  box: [number, number, number, number]
  attributes?: Record<string, unknown>
  provisionalModel?: boolean
  featured?: boolean
}

const ALDROP_OPTIONS = {
  finish: ['two-tone', 'rose-gold', 'brass-antique'],
  rod_length: ['8-inch', '10-inch', '12-inch'],
  rod_thickness: ['16x3-mm', '16x4-mm'],
  material: 'stainless-steel',
}
const ALDROP_401 = {
  rod_length: ['8-inch', '10-inch', '12-inch'],
  rod_thickness: ['13x1-5-mm', '14x2-mm', '16x3-mm', '16x4-mm'],
  material: 'stainless-steel',
  range: 'classic',
}
const HANDLE_OPTIONS = {
  size: ['8-inch', '10-inch', '12-inch'],
  finish: ['antique', 'stainless-steel', 'chrome-plated', 'black-matt', 'rose-gold'],
  material: 'stainless-steel',
}

// Grid boxes on the 852 × 1102 page preview
const G2x3 = [
  [66, 187, 388, 392],
  [464, 187, 786, 392],
  [66, 480, 388, 686],
  [464, 480, 786, 686],
  [66, 772, 388, 978],
  [464, 772, 786, 978],
] as const
const COL3 = [
  [55, 163, 294, 868],
  [307, 163, 546, 868],
  [560, 163, 799, 868],
] as const
const G2x4 = [
  [66, 150, 388, 318],
  [464, 150, 786, 318],
  [66, 369, 388, 537],
  [464, 369, 786, 537],
  [66, 588, 388, 756],
  [464, 588, 786, 756],
  [66, 807, 388, 975],
  [464, 807, 786, 975],
] as const
const G2x2 = [
  [52, 210, 413, 516],
  [439, 210, 800, 516],
  [52, 621, 413, 927],
  [439, 621, 800, 927],
] as const
const G3x2 = [
  [53, 157, 285, 485],
  [310, 157, 533, 485],
  [567, 157, 790, 485],
  [53, 604, 285, 932],
  [310, 604, 533, 932],
  [567, 604, 790, 932],
] as const
const G4x3 = [
  [52, 155, 220, 395],
  [245, 155, 413, 395],
  [439, 155, 607, 395],
  [632, 155, 800, 395],
  [52, 455, 220, 695],
  [245, 455, 413, 695],
  [439, 455, 607, 695],
  [632, 455, 800, 695],
  [52, 755, 220, 995],
  [245, 755, 413, 995],
  [439, 755, 607, 995],
  [632, 755, 800, 995],
] as const

const box = (b: readonly number[]) => [b[0], b[1], b[2], b[3]] as [number, number, number, number]

const aldrops = (
  page: number,
  first: number,
  count: number,
  range: string,
  rangeTitle: string,
  options: Record<string, unknown>,
): ProductSeed[] =>
  Array.from({ length: count }, (_, i) => ({
    model: `HOAL-${first + i}`,
    title: `${rangeTitle} stainless steel aldrop HOAL-${first + i}`,
    category: 'Aldrops',
    genericName: 'Door aldrop',
    page,
    box: box(G2x3[i]!),
    attributes: { ...options, range },
  }))

const handle = (model: string, design: string, page: number, i: number): ProductSeed => ({
  model,
  title: `${design} stainless steel pull handle ${model}`,
  category: 'Pull handles',
  genericName: 'Door pull handle',
  page,
  box: box(COL3[i]!),
  attributes: HANDLE_OPTIONS,
})

const glass = (n: number, design: string): ProductSeed => ({
  model: `HOGDH-${600 + n}`,
  title: `${design} glass door handle HOGDH-${600 + n}`,
  category: 'Glass door handles',
  genericName: 'Glass door handle',
  page: n <= 6 ? 13 : 14,
  box: box(G3x2[(n - 1) % 6]!),
  attributes: { material: 'stainless-steel' },
})

const ssKey: [string, string][] = [
  ['701', 'Hare Krishna'],
  ['702', 'Jai Shri Ram'],
  ['703', 'Jai Shri Krishna'],
  ['704', 'Home'],
  ['705', 'Birds'],
  ['706', 'Welcome'],
]
const alKey: [string, string][] = [
  ['751', 'Welcome'],
  ['752', 'Peacock'],
  ['753', 'Sweet Home'],
  ['754', 'Flute and peacock feather'],
  ['755', 'Veena'],
  ['756', 'Trishul'],
  ['757', 'Key'],
  ['758', 'Peacock flute'],
  ['759', 'Classic'],
  ['760', 'Flute'],
  ['761', 'Guitar'],
  ['762', 'Fish'],
  ['763', 'Shubh Labh'],
  ['764', 'Devotional'],
  ['765', 'Sitaram'],
]

export const PRODUCTS: ProductSeed[] = [
  ...aldrops(1, 101, 4, 'laser-cutting', 'Laser-cut', ALDROP_OPTIONS),
  ...aldrops(2, 201, 4, 'bmc-cutting', 'BMC-cut', ALDROP_OPTIONS),
  ...aldrops(3, 301, 5, 'heavy', 'Heavy', ALDROP_OPTIONS),
  ...aldrops(4, 401, 5, 'classic', 'Classic', ALDROP_401),
  handle('HOPH-501', 'Floral vine', 5, 0),
  handle('HOPH-502', 'Leaf', 5, 1),
  handle('HOPH-503', 'Paisley', 5, 2),
  handle('HOPH-504', 'Feather', 6, 0),
  handle('HOPH-505', 'Triple swirl', 6, 1),
  handle('HOPH-506', 'Lattice', 6, 2),
  handle('HOPH-507', 'Scroll', 7, 0),
  handle('HOPH-508', 'Greek key', 7, 1),
  ...ssKey.map(([n, design], i): ProductSeed => ({
    model: `HOKH-${n}`,
    title: `${design} stainless steel key hanger HOKH-${n}`,
    category: 'Key hangers',
    genericName: 'Key hanger',
    page: 8,
    box: box(G2x3[i]!),
    attributes: { material: 'stainless-steel' },
  })),
  ...alKey.map(([n, design], i): ProductSeed => ({
    model: `HOKH-${n}`,
    title: `${design} aluminium key hanger HOKH-${n}`,
    category: 'Key hangers',
    genericName: 'Key hanger',
    page: i < 8 ? 9 : 10,
    box: box(G2x4[i % 8]!),
    attributes: { material: 'aluminium' },
  })),
  ...Array.from({ length: 8 }, (_, i): ProductSeed => ({
    model: `HOCB-${801 + i}`,
    title: `Fancy curtain bracket HOCB-${801 + i}`,
    category: 'Curtain brackets',
    genericName: 'Curtain bracket',
    page: i < 4 ? 11 : 12,
    box: box(G2x2[i % 4]!),
  })),
  glass(1, 'Om lattice'),
  glass(2, 'Ganesha'),
  glass(3, 'Shubh Labh kalash'),
  glass(4, 'Sun'),
  glass(5, 'Peacock feather'),
  glass(6, 'Peacock pair'),
  glass(7, 'Tree of life'),
  glass(8, 'Arc'),
  glass(9, 'Honeycomb'),
  glass(10, 'Lotus'),
  glass(11, 'Star flower'),
  glass(12, 'Floral'),
  ...Array.from({ length: 12 }, (_, i): ProductSeed => ({
    model: `HODS-${851 + i}`,
    title: `Stainless steel door stopper HODS-${851 + i}`,
    category: 'Door stoppers',
    genericName: 'Door stopper',
    page: 15,
    box: box(G4x3[i]!),
    attributes: i < 10 ? { material: 'stainless-steel' } : undefined,
  })),
  ...(
    [
      ['A', 'Square-base oval', [455, 125, 720, 335]],
      ['B', 'Square-base tapered', [560, 365, 720, 560]],
      ['C', 'Open hook', [45, 612, 290, 780]],
      ['D', 'Rectangle', [370, 612, 548, 780]],
      ['E', 'Triangle', [625, 612, 800, 780]],
      ['F', 'Open rectangle', [40, 822, 262, 1002]],
      ['G', 'Round', [380, 822, 548, 1002]],
      ['H', 'Oval', [612, 822, 800, 1002]],
    ] as const
  ).map(([suffix, design, b]): ProductSeed => ({
    model: `STR-001-${suffix}`,
    title: `${design} stainless steel towel ring`,
    category: 'Towel rings',
    genericName: 'Towel ring',
    page: 16,
    box: box(b),
    attributes: { material: 'stainless-steel', mounting: 'wall-mounted' },
    provisionalModel: true,
  })),
  ...(
    [
      ['01', 'Multi 3 in 1 shelf with S.S. tumbler', [50, 146, 380, 406]],
      ['02', 'Double decker shelf, square pipe', [472, 146, 803, 406]],
      ['03', 'Double layer shelf with towel rod', [50, 461, 380, 752]],
      ['04', 'Multi 3 in 1 shelf with tumbler and soap dish', [472, 461, 803, 752]],
      ['05', 'Soap dish and tumbler shelf', [50, 808, 288, 1000]],
      ['06', 'Square pipe shelf', [307, 808, 545, 1000]],
      ['07', 'Strip shelf', [564, 808, 802, 1000]],
    ] as const
  ).map(([n, title, b]): ProductSeed => ({
    model: `HO-BS-${n}`,
    title: `${title}`,
    category: 'Bathroom shelves',
    genericName: 'Bathroom shelf',
    page: 17,
    box: box(b),
    attributes: { material: 'stainless-steel', mounting: 'wall-mounted' },
    provisionalModel: true,
  })),
  {
    model: 'HO-LSD-01',
    title: 'Wall-mounted S.S. liquid soap dispenser',
    category: 'Soap dishes and dispensers',
    genericName: 'Liquid soap dispenser',
    page: 18,
    box: [50, 145, 803, 540],
    attributes: {
      finish: ['matte-black', 'rose-gold', 'chrome', 'gold'],
      material: 'stainless-steel',
      mounting: 'wall-mounted',
    },
    provisionalModel: true,
  },
  ...(
    [
      ['02', '2 in 1 shelf, dispenser and tumbler', [50, 597, 283, 768]],
      ['03', '2 in 1 shelf, soap dish and tumbler', [310, 597, 543, 768]],
      ['04', 'Double soap dish shelf', [570, 597, 803, 768]],
      ['05', 'Liquid soap dispenser shelf', [50, 828, 283, 999]],
      ['06', 'Tumbler holder shelf', [310, 828, 543, 999]],
      ['07', 'Single soap dish shelf', [570, 828, 803, 999]],
    ] as const
  ).map(([n, title, b]): ProductSeed => ({
    model: `HO-SDS-${n}`,
    title,
    category: 'Soap dishes and dispensers',
    genericName: 'Bathroom shelf',
    page: 18,
    box: box(b),
    attributes: { material: 'stainless-steel', mounting: 'wall-mounted' },
    provisionalModel: true,
  })),
  {
    model: 'SDGH-001',
    title: 'Soap dish and glass holder SDGH-001',
    category: 'Soap dishes and dispensers',
    genericName: 'Soap dish and glass holder',
    page: 19,
    box: [50, 145, 385, 312],
    attributes: { material: 'stainless-steel', mounting: 'wall-mounted' },
  },
  {
    model: 'DSD-001',
    title: 'Double soap dish DSD-001',
    category: 'Soap dishes and dispensers',
    genericName: 'Soap dish',
    page: 19,
    box: [470, 145, 800, 312],
    attributes: { material: 'stainless-steel', mounting: 'wall-mounted' },
  },
  ...(
    [
      ['A', 'Square soap dish', [55, 400, 290, 552]],
      ['B', 'Oval soap dish', [358, 390, 560, 552]],
      ['C', 'Round soap dish', [648, 390, 796, 552]],
    ] as const
  ).map(([suffix, title, b]): ProductSeed => ({
    model: `SD-001-${suffix}`,
    title: `${title}`,
    category: 'Soap dishes and dispensers',
    genericName: 'Soap dish',
    page: 19,
    box: box(b),
    attributes: { material: 'stainless-steel', mounting: 'wall-mounted' },
    provisionalModel: true,
  })),
  {
    model: 'HO-TPH-01',
    title: 'Toilet paper holder',
    category: 'Bathroom accessories',
    genericName: 'Toilet paper holder',
    page: 19,
    box: [40, 812, 205, 1008],
    attributes: { material: 'stainless-steel', mounting: 'wall-mounted' },
    provisionalModel: true,
  },
  {
    model: 'TR-001-A',
    title: 'Folding towel rack with hooks',
    category: 'Towel racks',
    genericName: 'Towel rack',
    page: 20,
    box: [50, 145, 803, 372],
    attributes: { material: 'stainless-steel', mounting: 'wall-mounted' },
    provisionalModel: true,
  },
  {
    model: 'TR-001-B',
    title: 'Square pipe towel rack with hooks',
    category: 'Towel racks',
    genericName: 'Towel rack',
    page: 20,
    box: [48, 388, 374, 541],
    attributes: { material: 'stainless-steel', mounting: 'wall-mounted' },
    provisionalModel: true,
  },
  {
    model: 'TR-001-C',
    title: 'Round pipe towel rack with hooks',
    category: 'Towel racks',
    genericName: 'Towel rack',
    page: 20,
    box: [478, 388, 803, 541],
    attributes: { material: 'stainless-steel', mounting: 'wall-mounted' },
    provisionalModel: true,
  },
]

/** The lifestyle photos used as home page banners (page, box). */
export const BANNERS = {
  towelRings: { page: 16, box: [0, 146, 381, 598] as [number, number, number, number] },
  soapDispenser: { page: 18, box: [50, 145, 803, 540] as [number, number, number, number] },
  towelRack: { page: 20, box: [50, 145, 803, 372] as [number, number, number, number] },
}

export const ABOUT_US = [
  'Home Orbit is a well-known company in India that offers a comprehensive and wide range of hardware and bathroom products. We think we can influence culture and elevate people’s quality of life by offering more than just basic necessities.',
  'We anticipate gaining the confidence of our customers through innovation, client satisfaction, and quality control, and counting on them to represent our business and products as lifelong brand ambassadors. Our elegant bathroom and hardware solutions are made with the best materials and most cutting-edge technologies currently on the market.',
  'Over the past seven years, we have received numerous honours, making us the most prestigious manufacturer of bathroom and hardware goods in India. We have a significant online presence, which has enabled us to amass millions of loyal customers across the nation.',
]

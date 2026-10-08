// CSV import (docs/12 "CSV import", docs/screens/vendor-cms.md `cms-import`)

export const IMPORT_KINDS = [
  { value: 'products', label: 'Products: create and update' },
  { value: 'stock', label: 'Stock and prices only' },
  { value: 'dealers', label: 'Dealers' },
] as const
export type ImportKind = (typeof IMPORT_KINDS)[number]['value']

export const IMPORT_STATUSES = [
  { value: 'checked', label: 'Checked' },
  { value: 'queued', label: 'Waiting to run' },
  { value: 'running', label: 'Importing' },
  { value: 'done', label: 'Done' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const
export type ImportStatus = (typeof IMPORT_STATUSES)[number]['value']

/** One file at a time stays small enough to check while the vendor waits */
export const MAX_ROWS = 5_000
export const MAX_BYTES = 5 * 1024 * 1024
/** Errors kept on a job (the report lists them all up to this) */
export const MAX_ERRORS = 2_000

/** The templates' columns and a sample row */
export const TEMPLATES: Record<ImportKind, { columns: string[]; sample: string[][] }> = {
  products: {
    columns: [
      'product_handle',
      'title',
      'category_path',
      'brand',
      'model_number',
      'sku',
      'option.finish',
      'price',
      'mrp',
      'gst_rate',
      'hsn_code',
      'purchase_mode',
      'stock_qty',
      'short_description',
      'search_keywords',
      'generic_name',
      'net_quantity',
      'country_of_origin',
      'weight_g',
      'seo_title',
      'seo_description',
    ],
    sample: [
      [
        'aria-basin-mixer',
        'Aria single-lever basin mixer',
        'Bathroom > Faucets',
        'Aquaverde',
        'AV-BM-1120',
        'AV-BM-1120-CP',
        'Chrome',
        '4250',
        '5190',
        '18',
        '8481',
        'buy',
        '12',
        'Ceramic cartridge, 10-year warranty',
        'tap, faucet, mixer',
        'Basin mixer',
        '1 piece',
        'IN',
        '1200',
        '',
        '',
      ],
      [
        'aria-basin-mixer',
        '',
        '',
        '',
        '',
        'AV-BM-1120-BM',
        'Black matt',
        '4590',
        '5490',
        '',
        '',
        '',
        '5',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ],
    ],
  },
  stock: {
    columns: ['sku', 'price', 'mrp', 'stock_qty'],
    sample: [['AV-BM-1120-CP', '4250', '5190', '12']],
  },
  dealers: {
    columns: [
      'name',
      'type',
      'address',
      'city',
      'state',
      'pincode',
      'phone',
      'email',
      'hours',
      'latitude',
      'longitude',
      'show_on_store',
    ],
    sample: [
      [
        'Shree Sanitation',
        'Dealer',
        'Shop 4, Baner Road',
        'Pune',
        'Maharashtra',
        '411045',
        '98765 00011',
        '',
        'Mon to Sat, 10 am to 8 pm',
        '18.5590',
        '73.7868',
        'yes',
      ],
    ],
  },
}

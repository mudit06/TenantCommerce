export const ATTRIBUTE_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Select (one)' },
  { value: 'multiselect', label: 'Select (many)' },
  { value: 'boolean', label: 'Yes or no' },
  { value: 'color', label: 'Colour or finish swatches' },
] as const
export type AttributeType = (typeof ATTRIBUTE_TYPES)[number]['value']

/** Types with a fixed list of values to pick from */
export const OPTION_TYPES: readonly AttributeType[] = ['select', 'multiselect', 'color']
/** Types that can split a product into variants (one value per SKU) */
export const VARIANT_AXIS_TYPES: readonly AttributeType[] = ['select', 'color']
/** More than three axes makes too many SKUs to manage by hand */
export const MAX_VARIANT_AXES = 3

export const DOCUMENT_TYPES = [
  { value: 'spec-sheet', label: 'Spec sheet' },
  { value: 'installation-manual', label: 'Installation manual' },
  { value: 'brochure', label: 'Brochure' },
  { value: 'catalogue', label: 'Catalogue' },
  { value: 'price-list', label: 'Price list' },
  { value: 'warranty-card', label: 'Warranty card' },
  { value: 'certificate', label: 'Certificate' },
] as const

/** Faucets > Basin mixers > Deck-mounted: deeper trees are hard to browse on a phone */
export const MAX_CATEGORY_DEPTH = 3

/** How shoppers get a product (docs/12): buy online, ask for a quote, or either */
export const PURCHASE_MODES = [
  { value: 'buy', label: 'Buy online' },
  { value: 'enquire', label: 'Request a quote only' },
  { value: 'both', label: 'Both' },
] as const
export type PurchaseMode = (typeof PURCHASE_MODES)[number]['value']

/** GST slabs in force since 22 September 2025 (docs/06 tax-rates; the tax-rates collection replaces this list) */
export const GST_RATES = [0, 0.25, 3, 5, 18, 40] as const

export const PRODUCT_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active (on the store)' },
  { value: 'archived', label: 'Archived' },
] as const

export const MADE_BY = [
  { value: 'manufacturer', label: 'Manufacturer' },
  { value: 'packer', label: 'Packer' },
  { value: 'importer', label: 'Importer' },
] as const

export const HSN_CODE = /^(\d{4}|\d{6}|\d{8})$/

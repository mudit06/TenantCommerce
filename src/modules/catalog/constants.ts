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

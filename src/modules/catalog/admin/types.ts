// Shapes the product editor's helpers receive from the catalog admin endpoints.

export type AttributeOption = { value?: string | null; label: string; swatchHex?: string | null }
export type AttributeDef = {
  code?: string | null
  label: string
  type: 'text' | 'number' | 'select' | 'multiselect' | 'boolean' | 'color'
  unit?: string | null
  group?: string | null
  isRequired?: boolean | null
  isVariantAxis?: boolean | null
  options?: AttributeOption[] | null
}
export type VariantAxis = {
  code: string
  label: string
  options: { value: string; label: string }[]
}

export const relationId = (value: unknown): string | null => {
  if (typeof value === 'string' && value) return value
  if (value && typeof value === 'object' && 'id' in value)
    return String((value as { id: unknown }).id)
  return null
}

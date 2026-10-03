import type { AttributeSet } from '@/payload-types'

// Product specifications are stored as one JSON object keyed by attribute code (docs/12):
//   { material: 'stainless-steel', warranty_years: 5, finish: ['antique', 'rose-gold'] }
// Variant options (finish, size) hold the list of values the product is offered in; each
// variant then picks one value per option. Pure functions, unit tested.

export type Attribute = NonNullable<AttributeSet['attributes']>[number]
export type AttributeValues = Record<string, unknown>

const optionValues = (attribute: Attribute) =>
  (attribute.options ?? []).map((option) => option.value).filter((v): v is string => Boolean(v))

const isEmpty = (value: unknown) =>
  value === undefined ||
  value === null ||
  value === '' ||
  (Array.isArray(value) && value.length === 0)

/** Whether a value is stored as a list: multiselect, and every variant option (offered values). */
export const takesList = (attribute: Attribute) =>
  attribute.type === 'multiselect' || Boolean(attribute.isVariantAxis)

/**
 * Problems with a product's specification values against its attribute set, as readable
 * messages. `requireRequired` is on when the product goes active.
 */
export function productAttributeProblems(
  attributes: readonly Attribute[],
  values: AttributeValues,
  { requireRequired = false }: { requireRequired?: boolean } = {},
): string[] {
  const problems: string[] = []
  const byCode = new Map(attributes.map((attribute) => [attribute.code ?? '', attribute]))
  for (const code of Object.keys(values)) {
    if (!byCode.has(code))
      problems.push(`“${code}” is not a field of this category’s attribute set`)
  }
  for (const attribute of attributes) {
    const value = values[attribute.code ?? '']
    const name = attribute.label
    if (isEmpty(value)) {
      if (requireRequired && attribute.isRequired) problems.push(`${name} is required`)
      continue
    }
    const allowed = optionValues(attribute)
    if (takesList(attribute)) {
      if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
        problems.push(`${name}: pick from the list`)
      } else if (attribute.type !== 'text' && value.some((item) => !allowed.includes(item))) {
        problems.push(
          `${name}: “${value.find((item) => !allowed.includes(item))}” is not one of its options`,
        )
      }
      continue
    }
    switch (attribute.type) {
      case 'number':
        if (typeof value !== 'number' || !Number.isFinite(value))
          problems.push(`${name} must be a number`)
        break
      case 'boolean':
        if (typeof value !== 'boolean') problems.push(`${name} must be yes or no`)
        break
      case 'select':
      case 'color':
        if (typeof value !== 'string' || !allowed.includes(value)) {
          problems.push(`${name}: pick one of its options`)
        }
        break
      default:
        if (typeof value !== 'string') problems.push(`${name} must be text`)
    }
  }
  return problems
}

/** Drops empty values so the stored JSON stays small and filters don't see blanks. */
export function compactValues(values: AttributeValues): AttributeValues {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => !isEmpty(value)))
}

export type VariantAxis = {
  code: string
  label: string
  options: { value: string; label: string }[]
}

/**
 * The product's variant options with the values it is offered in. An option with nothing ticked
 * doesn't apply to this product (its finishes or sizes aren't known or don't vary).
 */
export function variantAxes(
  attributes: readonly Attribute[],
  values: AttributeValues,
): VariantAxis[] {
  return attributes
    .filter((attribute) => attribute.isVariantAxis && attribute.code)
    .map((attribute) => {
      const offered = values[attribute.code!]
      return {
        code: attribute.code!,
        label: attribute.label,
        options: (attribute.options ?? [])
          .filter(
            (option) => option.value && Array.isArray(offered) && offered.includes(option.value),
          )
          .map((option) => ({ value: option.value!, label: option.label })),
      }
    })
    .filter((axis) => axis.options.length > 0)
}

/** Every combination of the axes' values: 3 finishes × 3 lengths = 9 variants. */
export function combinations(axes: readonly VariantAxis[]): Record<string, string>[] {
  return axes
    .reduce<Record<string, string>[]>(
      (rows, axis) =>
        rows.flatMap((row) =>
          axis.options.map((option) => ({ ...row, [axis.code]: option.value })),
        ),
      [{}],
    )
    .filter((row) => Object.keys(row).length > 0)
}

/** "Antique · 8 in" from { finish: 'antique', length: '8-in' }. */
export function variantTitle(
  axes: readonly VariantAxis[],
  options: Record<string, string>,
): string {
  return axes
    .map(
      (axis) =>
        axis.options.find((option) => option.value === options[axis.code])?.label ??
        options[axis.code],
    )
    .filter(Boolean)
    .join(' · ')
}

/** HOAL-101-ANTIQUE-8-IN: the model number plus each option value, upper case. */
export function variantSku(
  modelNumber: string,
  axes: readonly VariantAxis[],
  options: Record<string, string>,
) {
  return [modelNumber, ...axes.map((axis) => options[axis.code])]
    .filter(Boolean)
    .join('-')
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, '-')
    .replace(/-+/g, '-')
}

/** Problems with one variant's options against the product's axes. */
export function variantOptionProblems(
  axes: readonly VariantAxis[],
  options: Record<string, unknown>,
): string[] {
  const problems: string[] = []
  for (const axis of axes) {
    const value = options[axis.code]
    if (typeof value !== 'string' || !axis.options.some((option) => option.value === value)) {
      problems.push(`Pick a ${axis.label.toLowerCase()} this product is offered in`)
    }
  }
  for (const code of Object.keys(options)) {
    if (!axes.some((axis) => axis.code === code))
      problems.push(`“${code}” is not an option of this product`)
  }
  return problems
}

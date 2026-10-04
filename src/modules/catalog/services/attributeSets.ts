import {
  MAX_VARIANT_AXES,
  OPTION_TYPES,
  VARIANT_AXIS_TYPES,
  type AttributeType,
} from '../constants'

export type AttributeInput = {
  code?: string | null
  label?: string | null
  type?: AttributeType | null
  isVariantAxis?: boolean | null
  options?: { value?: string | null; label?: string | null }[] | null
}

export const ATTRIBUTE_CODE = /^[a-z][a-z0-9_]{1,39}$/
export const OPTION_VALUE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Problems with an attribute set, as readable messages (empty when valid). Codes become keys in
 * product data and filter URLs, so they must be unique, lowercase and stable (docs/12).
 */
export function attributeSetProblems(attributes: readonly AttributeInput[]): string[] {
  const problems: string[] = []
  const codes = new Set<string>()
  let axes = 0
  attributes.forEach((attribute, index) => {
    const name = attribute.label || attribute.code || `Field ${index + 1}`
    const code = attribute.code ?? ''
    if (!ATTRIBUTE_CODE.test(code)) {
      problems.push(
        `${name}: the code must start with a letter and use lowercase letters, numbers or _ (for example flow_rate)`,
      )
    } else if (codes.has(code)) {
      problems.push(`${name}: the code "${code}" is used twice`)
    }
    codes.add(code)
    const type = attribute.type ?? 'text'
    const options = attribute.options ?? []
    if (OPTION_TYPES.includes(type)) {
      if (options.length === 0) problems.push(`${name}: add at least one option to pick from`)
      const values = new Set<string>()
      for (const option of options) {
        const value = option.value ?? ''
        if (!OPTION_VALUE.test(value)) {
          problems.push(`${name}: option "${option.label ?? value}" needs a value like matt-black`)
        } else if (values.has(value)) {
          problems.push(`${name}: option value "${value}" is used twice`)
        }
        values.add(value)
      }
    }
    if (attribute.isVariantAxis) {
      axes += 1
      if (!VARIANT_AXIS_TYPES.includes(type)) {
        problems.push(`${name}: only "Select (one)" or swatch fields can be finish or size options`)
      }
    }
  })
  if (axes > MAX_VARIANT_AXES) {
    problems.push(`At most ${MAX_VARIANT_AXES} fields can be finish, size or colour options`)
  }
  return problems
}

/** Option value from a label: "Matt black" -> "matt-black". */
export const optionValueFrom = (label: string) =>
  label
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

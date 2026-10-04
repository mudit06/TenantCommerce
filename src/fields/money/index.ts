import type { GroupField } from 'payload'

import { CURRENCIES } from '@/lib/money'

type MoneyFieldOptions = {
  name: string
  label?: string
  required?: boolean
  description?: string
  readOnly?: boolean
}

/**
 * `{ amountMinor, currency }` (docs/06, ADR 0004). Staff type rupees; the field stores paise.
 */
export function moneyField({
  name,
  label,
  required = false,
  description,
  readOnly,
}: MoneyFieldOptions): GroupField {
  return {
    name,
    // The amount field carries the label; a group heading would repeat it
    label: false,
    type: 'group',
    interfaceName: 'Money',
    admin: { description, hideGutter: true },
    fields: [
      {
        name: 'amountMinor',
        label: label ?? 'Amount',
        type: 'number',
        required,
        min: 0,
        admin: {
          readOnly,
          components: { Field: '@/fields/money/RupeeInput#RupeeInput' },
        },
        // A custom validate replaces Payload's own, so `required` and `min` are checked here too
        validate: (value: number | null | undefined) => {
          if (value === null || value === undefined) return required ? 'Enter an amount' : true
          if (!Number.isSafeInteger(value)) return 'Amount must be whole paise'
          return value < 0 ? 'Amount can’t be negative' : true
        },
      },
      {
        name: 'currency',
        type: 'select',
        // Optional amounts (MRP, a variant's own price) leave the whole group optional
        required,
        defaultValue: 'INR',
        options: [...CURRENCIES],
        admin: { hidden: true },
      },
    ],
  }
}

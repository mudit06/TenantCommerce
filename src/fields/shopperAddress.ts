import type { GroupField } from 'payload'

import { GST_STATE_OPTIONS } from '@/lib/gst/gstin'

export const PINCODE = /^[1-9][0-9]{5}$/
export const INDIAN_MOBILE = /^\+91[6-9][0-9]{9}$/

/**
 * A shopper's delivery or billing address as stored on carts, orders and invoices (docs/06
 * addresses): who receives it, where, and the GST state that decides the place of supply.
 */
export function shopperAddressGroup(name: string, label?: string): GroupField {
  return {
    name,
    label,
    type: 'group',
    interfaceName: 'ShopperAddress',
    fields: [
      {
        type: 'row',
        fields: [
          { name: 'name', type: 'text' },
          { name: 'phone', type: 'text', admin: { description: '+91 and 10 digits' } },
        ],
      },
      { name: 'line1', label: 'House, building, street', type: 'text' },
      { name: 'line2', label: 'Area, locality', type: 'text' },
      { name: 'landmark', type: 'text' },
      {
        type: 'row',
        fields: [
          { name: 'city', type: 'text' },
          { name: 'stateCode', label: 'State', type: 'select', options: GST_STATE_OPTIONS },
          {
            name: 'pincode',
            type: 'text',
            validate: (value: string | null | undefined) =>
              !value || PINCODE.test(value) ? true : 'A pincode has 6 digits',
          },
        ],
      },
      { name: 'country', type: 'text', defaultValue: 'IN', admin: { hidden: true } },
    ],
  }
}

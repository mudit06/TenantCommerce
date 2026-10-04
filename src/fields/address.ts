import type { GroupField } from 'payload'

import { GST_STATE_OPTIONS } from '@/lib/gst/gstin'

export function addressGroup(name: string, label?: string): GroupField {
  return {
    name,
    label,
    type: 'group',
    interfaceName: 'PostalAddress',
    fields: [
      { name: 'line1', label: 'Address line 1', type: 'text' },
      { name: 'line2', label: 'Address line 2', type: 'text' },
      {
        type: 'row',
        fields: [
          { name: 'city', type: 'text' },
          { name: 'stateCode', label: 'State', type: 'select', options: GST_STATE_OPTIONS },
          {
            name: 'pincode',
            type: 'text',
            validate: (value: string | null | undefined) =>
              !value || /^[1-9][0-9]{5}$/.test(value) ? true : 'A pincode has 6 digits',
          },
        ],
      },
    ],
  }
}

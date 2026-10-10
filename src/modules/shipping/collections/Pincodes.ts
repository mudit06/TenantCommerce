import type { CollectionConfig } from 'payload'

import { nobody, superAdminOnly } from '@/access'
import { GST_STATE_OPTIONS } from '@/lib/gst/gstin'

/**
 * India's pincode directory (docs/06 `pincodes`, platform data, no store): city and GST state
 * for checkout autofill and the place of supply. Loaded with `pnpm import:pincodes <csv>` from
 * the government's All India Pincode Directory (data.gov.in). Until it is loaded, the state comes
 * from the pincode's first digits and the shopper confirms it (src/modules/shipping/services).
 */
export const Pincodes: CollectionConfig = {
  slug: 'pincodes',
  admin: { hidden: true },
  access: { read: superAdminOnly, create: nobody, update: nobody, delete: nobody },
  fields: [
    { name: 'pincode', type: 'text', required: true, unique: true },
    { name: 'city', type: 'text' },
    { name: 'district', type: 'text' },
    { name: 'stateCode', type: 'select', required: true, options: GST_STATE_OPTIONS },
    // The post office's position when the directory has it: a new dealer's first map pin
    { name: 'latitude', type: 'number' },
    { name: 'longitude', type: 'number' },
  ],
}

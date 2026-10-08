import type { CollectionConfig } from 'payload'

import { nobody } from '@/access'
import { featureGatedAccess } from '@/modules/tenancy'

import { PAYOUT_METHODS } from '../constants'

/**
 * A payout statement (docs/06 `affiliate-payouts`): the vendor pays its affiliate outside the
 * platform (UPI or bank) and records it here with gross, TDS and net. The platform never holds
 * the money.
 */
export const AffiliatePayouts: CollectionConfig = {
  slug: 'affiliate-payouts',
  admin: { hidden: true },
  access: {
    read: featureGatedAccess({ feature: 'affiliate', roles: ['owner', 'manager'] }),
    create: nobody,
    update: nobody,
    delete: nobody,
  },
  indexes: [
    { fields: ['tenant', 'number'], unique: true },
    { fields: ['tenant', 'affiliate', 'paidOn'] },
  ],
  fields: [
    { name: 'number', type: 'text', required: true },
    { name: 'affiliate', type: 'text', required: true },
    { name: 'referrals', type: 'text', hasMany: true },
    { name: 'grossMinor', type: 'number', required: true },
    { name: 'tdsMinor', type: 'number', required: true },
    { name: 'tdsPercent', type: 'number' },
    { name: 'netMinor', type: 'number', required: true },
    /** e.g. 2026-27, for the year's TDS threshold */
    { name: 'financialYear', type: 'text', required: true },
    { name: 'status', type: 'select', defaultValue: 'paid', options: ['draft', 'paid'] },
    { name: 'paidOn', type: 'date', required: true },
    { name: 'method', type: 'select', options: [...PAYOUT_METHODS] },
    { name: 'reference', type: 'text' },
    { name: 'recordedBy', type: 'text' },
  ],
}

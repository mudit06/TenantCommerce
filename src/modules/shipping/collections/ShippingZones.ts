import type { CollectionConfig } from 'payload'

import { ANY_STORE_ROLE, STORE_ADMIN, tenantRoleOrPlatform } from '@/access'
import { moneyField } from '@/fields/money'
import { GST_STATE_OPTIONS } from '@/lib/gst/gstin'

import { RATE_TYPES } from '../constants'

const PINCODE_OR_PREFIX = /^[1-9][0-9]{1,5}$/

/**
 * Where the store delivers, the fee, whether COD is allowed and how long it takes (docs/06
 * `shipping-zones`, docs/screens Shipping zones). A pincode belongs to the most specific zone
 * that lists it: its own pincode, then a pincode prefix, then its state. The fee is the rate
 * card, used when Shiprocket isn't connected or can't answer (live rates, mudit 6 October 2026).
 *
 * As built: the rate lives on the zone (docs/06 drew a separate `shipping-rates`), since every
 * zone has exactly one.
 */
export const ShippingZones: CollectionConfig = {
  slug: 'shipping-zones',
  labels: { singular: 'Shipping zone', plural: 'Shipping zones' },
  admin: {
    group: 'Store',
    useAsTitle: 'name',
    defaultColumns: ['name', 'states', 'rateType', 'codAllowed', 'etaMinDays'],
  },
  defaultSort: 'sortOrder',
  access: {
    read: tenantRoleOrPlatform({ roles: ANY_STORE_ROLE, supportCanAccess: true }),
    create: tenantRoleOrPlatform({ roles: STORE_ADMIN }),
    update: tenantRoleOrPlatform({ roles: STORE_ADMIN }),
    delete: tenantRoleOrPlatform({ roles: STORE_ADMIN }),
  },
  indexes: [{ fields: ['tenant', 'sortOrder'] }],
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', required: true },
        {
          name: 'isServiceable',
          label: 'We deliver here',
          type: 'checkbox',
          defaultValue: true,
          admin: { description: 'Off: shoppers in this zone can’t order (a blocked area)' },
        },
        { name: 'sortOrder', type: 'number', defaultValue: 0 },
      ],
    },
    {
      name: 'states',
      type: 'select',
      hasMany: true,
      options: GST_STATE_OPTIONS,
    },
    {
      name: 'pincodePrefixes',
      label: 'Pincodes or pincode starts',
      type: 'text',
      hasMany: true,
      admin: {
        description: 'Whole pincodes (411045) or their first digits (4110 covers 411001 to 411099)',
      },
      validate: (values: string[] | null | undefined) =>
        (values ?? []).every((value) => PINCODE_OR_PREFIX.test(value))
          ? true
          : 'Use 2 to 6 digits, without spaces',
    },
    {
      type: 'row',
      fields: [
        {
          name: 'rateType',
          label: 'Fee based on',
          type: 'select',
          required: true,
          defaultValue: 'flat',
          options: [...RATE_TYPES],
        },
        moneyField({ name: 'fee', label: 'Fee incl. GST' }),
        moneyField({ name: 'freeAbove', label: 'Free above' }),
      ],
    },
    {
      type: 'row',
      admin: { condition: (data) => data?.rateType === 'weight' },
      fields: [
        {
          name: 'baseWeightGrams',
          label: 'Fee covers up to (g)',
          type: 'number',
          defaultValue: 2000,
          min: 0,
        },
        moneyField({ name: 'perExtraKg', label: 'Then per extra kg' }),
      ],
    },
    {
      name: 'valueBrackets',
      label: 'Fee by order value',
      type: 'array',
      admin: {
        condition: (data) => data?.rateType === 'order-value',
        description: 'The highest bracket the order reaches applies',
      },
      fields: [
        {
          type: 'row',
          fields: [
            moneyField({ name: 'from', label: 'Orders from', required: true }),
            moneyField({ name: 'bracketFee', label: 'Fee', required: true }),
          ],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'codAllowed',
          label: 'Allow cash on delivery',
          type: 'checkbox',
          defaultValue: true,
        },
        { name: 'etaMinDays', label: 'Delivery from (days)', type: 'number', min: 0 },
        { name: 'etaMaxDays', label: 'to (days)', type: 'number', min: 0 },
      ],
    },
  ],
}

import type { CollectionConfig } from 'payload'

import { CATALOG_READ, STORE_ADMIN } from '@/access'
import { featureGatedAccess, hiddenWithoutFeature } from '@/modules/tenancy'

const PINCODE = /^[1-9][0-9]{5}$/

/**
 * Dealers, distributors and showrooms for the store's dealer locator (docs/screens Dealers).
 * Needs the dealer-locator feature; switched off, the list stays but nobody in the store sees it.
 */
export const Dealers: CollectionConfig = {
  slug: 'dealers',
  labels: { singular: 'Dealer', plural: 'Dealers' },
  admin: {
    group: 'Store',
    useAsTitle: 'name',
    defaultColumns: ['name', 'type', 'city', 'pincode', 'isActive'],
    listSearchableFields: ['name', 'city', 'pincode'],
    hidden: hiddenWithoutFeature('dealer-locator'),
    description: 'Only dealers marked “Show on store” appear on the dealer locator.',
  },
  access: {
    read: featureGatedAccess({
      feature: 'dealer-locator',
      roles: CATALOG_READ,
      supportCanAccess: true,
    }),
    create: featureGatedAccess({ feature: 'dealer-locator', roles: STORE_ADMIN }),
    update: featureGatedAccess({ feature: 'dealer-locator', roles: STORE_ADMIN }),
    delete: featureGatedAccess({ feature: 'dealer-locator', roles: STORE_ADMIN }),
  },
  indexes: [{ fields: ['tenant', 'pincode'] }, { fields: ['tenant', 'city'] }],
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', required: true },
        {
          name: 'type',
          type: 'select',
          required: true,
          defaultValue: 'dealer',
          options: [
            { label: 'Dealer', value: 'dealer' },
            { label: 'Distributor', value: 'distributor' },
            { label: 'Showroom', value: 'showroom' },
            { label: 'Service centre', value: 'service-centre' },
            { label: 'Experience centre', value: 'experience-centre' },
          ],
        },
        { name: 'isActive', label: 'Show on store', type: 'checkbox', defaultValue: true },
      ],
    },
    { name: 'address', type: 'textarea', required: true },
    {
      type: 'row',
      fields: [
        { name: 'city', type: 'text', required: true },
        { name: 'state', type: 'text', required: true },
        {
          name: 'pincode',
          type: 'text',
          required: true,
          validate: (value: string | null | undefined) =>
            !value || PINCODE.test(value) ? true : 'Enter a 6-digit pincode',
        },
      ],
    },
    {
      name: 'location',
      label: 'Map position (longitude, latitude)',
      type: 'point',
      admin: {
        description:
          'In Google Maps, right-click the shop to copy its latitude and longitude, then enter each in its own box. Dealers without a position are listed but not pinned on the map.',
      },
    },
    {
      type: 'row',
      fields: [
        { name: 'phone', type: 'text', required: true },
        { name: 'email', type: 'email' },
        {
          name: 'hours',
          label: 'Opening hours',
          type: 'text',
          admin: { placeholder: 'Mon to Sat, 10 am to 8 pm' },
        },
      ],
    },
    {
      name: 'categories',
      label: 'Stocks',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
    },
  ],
}

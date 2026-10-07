import type { CollectionConfig } from 'payload'

import { CUSTOMER_READ, nobody, tenantRoleOrPlatform } from '@/access'
import { shopperAddressGroup } from '@/fields/shopperAddress'

import { ADDRESS_TYPES } from '../constants'

/**
 * A signed-in shopper's saved addresses (docs/06 `addresses`). Written by the account pages and
 * checkout only. `customer` is a plain id: checkout saves it inside the order's transaction,
 * where a tenant-scoped relationship would be validated in parallel (docs/06 "Transactions").
 */
export const Addresses: CollectionConfig = {
  slug: 'addresses',
  labels: { singular: 'Address', plural: 'Addresses' },
  admin: { hidden: true },
  access: {
    read: tenantRoleOrPlatform({ roles: CUSTOMER_READ, supportCanAccess: true }),
    create: nobody,
    update: nobody,
    delete: nobody,
  },
  indexes: [{ fields: ['tenant', 'customer'] }],
  fields: [
    { name: 'customer', type: 'text', required: true, index: true },
    { name: 'type', type: 'select', defaultValue: 'home', options: [...ADDRESS_TYPES] },
    { name: 'isDefault', type: 'checkbox', defaultValue: false },
    { ...shopperAddressGroup('address'), interfaceName: undefined },
    { name: 'gstin', label: 'GSTIN for business invoices', type: 'text' },
    { name: 'legalName', label: 'Business name', type: 'text' },
  ],
}

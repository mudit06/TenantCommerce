import type { CollectionConfig, FieldAccess } from 'payload'

import { CUSTOMER_READ, nobody, STORE_ADMIN, tenantRoleOrPlatform } from '@/access'

import { CUSTOMER_ROLES, CUSTOMER_STATUSES } from '../constants'

const readOnly = { readOnly: true }
const never: FieldAccess = () => false

/**
 * A shopper's account in one store (docs/06 `customers`, ADR 0003). Created by the email code
 * on the storefront; staff see it on the Customers screen and may only add notes or block it.
 * The same email in another store is a different account.
 */
export const Customers: CollectionConfig = {
  slug: 'customers',
  labels: { singular: 'Customer', plural: 'Customers' },
  admin: {
    group: 'Sales',
    useAsTitle: 'email',
    defaultColumns: ['name', 'email', 'phone', 'ordersCount', 'lastOrderAt'],
    listSearchableFields: ['email', 'name', 'phone'],
    components: {
      views: {
        // docs/screens Customers: our own list with the privacy requests below it
        list: { Component: '@/modules/customers/admin/CustomersList#CustomersList' },
      },
    },
  },
  defaultSort: '-createdAt',
  access: {
    read: tenantRoleOrPlatform({ roles: CUSTOMER_READ, supportCanAccess: true }),
    create: nobody,
    update: tenantRoleOrPlatform({ roles: STORE_ADMIN }),
    delete: nobody,
  },
  indexes: [
    { fields: ['tenant', 'email'], unique: true },
    { fields: ['tenant', 'phone'] },
    { fields: ['tenant', 'lastOrderAt'] },
  ],
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', admin: readOnly },
        { name: 'email', type: 'email', required: true, admin: readOnly },
        { name: 'phone', type: 'text', admin: { ...readOnly, description: '+91 and 10 digits' } },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'status',
          type: 'select',
          required: true,
          defaultValue: 'active',
          options: [...CUSTOMER_STATUSES],
          admin: { description: 'A blocked account can’t sign in; its orders stay' },
        },
        {
          name: 'roles',
          type: 'select',
          hasMany: true,
          options: [...CUSTOMER_ROLES],
          admin: { ...readOnly, description: 'Every account can shop; roles add more' },
        },
        { name: 'emailVerified', type: 'checkbox', defaultValue: false, admin: readOnly },
      ],
    },
    {
      // Display only: the contact-preferences rows are the source of truth (docs/06, DPDP Act)
      name: 'marketingConsent',
      label: 'Offers agreed to',
      type: 'group',
      admin: readOnly,
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'email', type: 'checkbox', defaultValue: false },
            { name: 'whatsapp', type: 'checkbox', defaultValue: false },
          ],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'ordersCount', label: 'Orders', type: 'number', defaultValue: 0, admin: readOnly },
        {
          name: 'totalSpentMinor',
          label: 'Spent (paise)',
          type: 'number',
          defaultValue: 0,
          admin: readOnly,
        },
        { name: 'lastOrderAt', type: 'date', admin: readOnly },
        { name: 'lastLoginAt', type: 'date', admin: readOnly },
      ],
    },
    { name: 'notes', label: 'Team notes', type: 'textarea', admin: { description: 'Staff only' } },
    {
      // scrypt hash (ADR 0003). Never readable or writable through the API
      name: 'passwordHash',
      type: 'text',
      access: { read: never, create: never, update: never },
      admin: { hidden: true },
    },
  ],
}

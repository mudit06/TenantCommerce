import type { CollectionConfig } from 'payload'

import { nobody, tenantRoleOrPlatform } from '@/access'

import { CONNECTOR_PROVIDERS } from '../core/providers'

const readOnly = { readOnly: true }

/**
 * One provider connected by one store, with the vendor's own keys (docs/06 connector-configs,
 * docs/09). Written only by `saveConnector` and the webhook handlers, never through the API, so
 * secrets always pass through encryption. Read by the store owner (Payments, WhatsApp and SMS)
 * and, on the server only, by our team's Connectors tab. The sealed secret is never readable.
 */
export const ConnectorConfigs: CollectionConfig = {
  slug: 'connector-configs',
  labels: { singular: 'Connector', plural: 'Connectors' },
  admin: {
    // Edited on Payments, Shipping and WhatsApp and SMS, never as a raw list
    hidden: true,
    useAsTitle: 'provider',
  },
  access: {
    read: tenantRoleOrPlatform({ roles: ['owner'] }),
    create: nobody,
    update: nobody,
    delete: nobody,
  },
  indexes: [{ fields: ['tenant', 'provider'], unique: true }],
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'provider',
          type: 'select',
          required: true,
          options: CONNECTOR_PROVIDERS.map((provider) => ({
            value: provider.key,
            label: provider.label,
          })),
          admin: readOnly,
        },
        {
          name: 'kind',
          type: 'select',
          required: true,
          options: ['payment', 'shipping', 'messaging'],
          admin: readOnly,
        },
        { name: 'enabled', type: 'checkbox', defaultValue: true, admin: readOnly },
        {
          name: 'mode',
          type: 'select',
          defaultValue: 'live',
          options: [
            { value: 'test', label: 'Test' },
            { value: 'live', label: 'Live' },
          ],
          admin: readOnly,
        },
      ],
    },
    {
      name: 'publicConfig',
      type: 'json',
      admin: { ...readOnly, description: 'Safe to show: key IDs, phone number ID, pickup name' },
    },
    {
      name: 'secretSealed',
      type: 'text',
      // AES-256-GCM (src/connectors/core/secrets.ts). Nobody reads it through Payload.
      access: { read: () => false, create: () => false, update: () => false },
      admin: { hidden: true },
    },
    {
      name: 'savedSecrets',
      type: 'text',
      hasMany: true,
      admin: { ...readOnly, description: 'Which secrets are saved, never their values' },
    },
    {
      name: 'webhookToken',
      type: 'text',
      // Ours, not the vendor's: pasted into the provider's panel so its webhooks prove themselves
      admin: readOnly,
    },
    {
      name: 'routingKey',
      type: 'text',
      index: true,
      // WhatsApp phone number ID: unique across stores, it routes platform webhooks (docs/09)
      admin: { hidden: true },
    },
    {
      name: 'health',
      type: 'group',
      admin: readOnly,
      fields: [
        { name: 'lastTestAt', type: 'date' },
        { name: 'lastTestOk', type: 'checkbox' },
        { name: 'lastTestMessage', type: 'text' },
        { name: 'lastWebhookAt', type: 'date' },
        { name: 'lastWebhookOkAt', type: 'date' },
        {
          name: 'failingSince',
          type: 'date',
          admin: { description: 'First failure since the last success; cleared when one works' },
        },
        { name: 'failedCount', type: 'number', defaultValue: 0 },
        { name: 'lastErrorAt', type: 'date' },
        { name: 'lastError', type: 'text' },
        {
          name: 'details',
          type: 'json',
          admin: { description: 'Provider facts from the last check (WhatsApp quality, limit)' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'connectedBy', type: 'relationship', relationTo: 'users', admin: readOnly },
        { name: 'connectedAt', type: 'date', admin: readOnly },
        { name: 'updatedBy', type: 'relationship', relationTo: 'users', admin: readOnly },
      ],
    },
  ],
}

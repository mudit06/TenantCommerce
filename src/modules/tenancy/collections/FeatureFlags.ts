import { APIError, type CollectionConfig } from 'payload'

import {
  fieldSuperAdminOnly,
  idOf,
  isSuperAdmin,
  nobody,
  superAdminOnly,
  tenantRoleOrPlatform,
} from '@/access'
import { recordAudit } from '@/modules/audit'
import { FEATURES, getFeature, isFeatureKey } from '@/modules/features'
import { emit } from '@/lib/events'

import { assertCanEnable } from '../services/features'
import { revalidateTenantFeatures } from '../services/cache'
import { syncEnabledFeatures } from '../services/featureSync'

/**
 * Per-store feature switches (docs/08). Platform admins flip `enabled`, within the plan;
 * owners and managers may edit a switched-on feature's `config` (except platform caps).
 */
export const FeatureFlags: CollectionConfig = {
  slug: 'feature-flags',
  labels: { singular: 'Feature switch', plural: 'Feature switches' },
  admin: {
    useAsTitle: 'key',
    defaultColumns: ['key', 'tenant', 'enabled', 'enabledAt'],
    // Managed from the vendor's Features tab and each feature's own CMS screen
    group: false,
  },
  access: {
    read: tenantRoleOrPlatform({ roles: ['owner', 'manager'], supportCanAccess: true }),
    create: superAdminOnly,
    update: tenantRoleOrPlatform({ roles: ['owner', 'manager'] }),
    delete: nobody,
  },
  indexes: [{ fields: ['tenant', 'key'], unique: true }],
  fields: [
    {
      name: 'key',
      type: 'select',
      required: true,
      options: FEATURES.map((feature) => ({ value: feature.key, label: feature.label })),
      access: { update: () => false },
    },
    {
      name: 'enabled',
      type: 'checkbox',
      defaultValue: false,
      access: { create: fieldSuperAdminOnly, update: fieldSuperAdminOnly },
    },
    { name: 'config', type: 'json' },
    {
      name: 'enabledBy',
      type: 'relationship',
      relationTo: 'users',
      access: { create: () => false, update: () => false },
    },
    { name: 'enabledAt', type: 'date', access: { create: () => false, update: () => false } },
  ],
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, operation, req }) => {
        const key = String(data.key ?? originalDoc?.key ?? '')
        if (!isFeatureKey(key)) throw new APIError(`Unknown feature "${key}"`, 400, undefined, true)
        const feature = getFeature(key)
        const tenantId = idOf(data.tenant ?? originalDoc?.tenant)
        if (!tenantId) throw new APIError('A feature switch needs a store', 400, undefined, true)

        // Config is validated by the module's schema; platform caps are ours only
        if (data.config !== undefined && data.config !== null) {
          if (!feature.configSchema) {
            throw new APIError(`${feature.label} has no settings`, 400, undefined, true)
          }
          const previous = (originalDoc?.config ?? {}) as Record<string, unknown>
          const next = data.config as Record<string, unknown>
          if (!isSuperAdmin(req.user)) {
            for (const capKey of feature.platformConfigKeys ?? []) {
              if (JSON.stringify(next[capKey]) !== JSON.stringify(previous[capKey])) {
                throw new APIError(
                  `Only the platform team can change ${capKey}`,
                  403,
                  undefined,
                  true,
                )
              }
            }
          }
          const parsed = feature.configSchema.safeParse(next)
          if (!parsed.success) {
            throw new APIError(
              parsed.error.issues.map((issue) => issue.message).join('; '),
              400,
              undefined,
              true,
            )
          }
          data.config = parsed.data
        }

        const turningOn = data.enabled === true && (operation === 'create' || !originalDoc?.enabled)
        if (turningOn) {
          await assertCanEnable(req, { tenantId, key })
          data.enabledAt = new Date().toISOString()
          data.enabledBy = req.user?.collection === 'users' ? req.user.id : undefined
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req, context }) => {
        const tenantId = idOf(doc.tenant)
        if (!tenantId) return
        revalidateTenantFeatures(tenantId)
        await syncEnabledFeatures(req, tenantId)
        // Onboarding writes one summary entry instead of one per switch
        if (context.skipFeatureAudit) return
        const switched = operation === 'create' ? doc.enabled : doc.enabled !== previousDoc?.enabled
        const configChanged =
          operation === 'update' &&
          JSON.stringify(doc.config) !== JSON.stringify(previousDoc?.config)
        if (!switched && !configChanged) return
        const label = isFeatureKey(doc.key) ? getFeature(doc.key).label : doc.key
        await recordAudit(req, {
          action: 'feature_changed',
          tenant: tenantId,
          collectionSlug: 'feature-flags',
          docId: String(doc.id),
          summary: switched
            ? `Switched ${doc.enabled ? 'on' : 'off'} ${label}`
            : `Changed ${label} settings`,
          diff: configChanged ? { before: previousDoc?.config, after: doc.config } : undefined,
        })
        if (switched) {
          await emit(
            'feature.changed',
            { tenantId, key: doc.key, enabled: Boolean(doc.enabled) },
            { req },
          )
        }
      },
    ],
  },
}

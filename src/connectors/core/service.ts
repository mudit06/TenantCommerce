import { randomBytes } from 'node:crypto'

import type { Payload, PayloadRequest } from 'payload'
import { z } from 'zod'

import { hasTenantRole, idOf, isSuperAdmin, storeSessionOf } from '@/access'
import { readHiddenField, writeHiddenFields } from '@/lib/db/atomic'
import { env } from '@/lib/env'
import { AppError } from '@/lib/errors'
import { recordAudit } from '@/modules/audit'
import type { ConnectorConfig, Plan, Tenant } from '@/payload-types'

import { ProviderUnreachable } from './http'
import {
  CONNECTOR_PROVIDERS,
  getConnectorProvider,
  isConnectorProviderKey,
  type ConnectorProvider,
  type ConnectorProviderKey,
} from './providers'
import { CONNECTOR_IMPLEMENTATIONS } from './registry'
import { decryptSecret, encryptSecret, maskValue } from './secrets'
import type { ConnectorContext, ConnectorMode, TestResult } from './types'

// Connecting a provider to a store (docs/09): the plan and our team's switch decide whether it
// may be used; the store owner (or our team while managing the store) enters the vendor's own
// keys; secrets are encrypted on the way in and never come back out.

export const saveConnectorSchema = z.object({
  tenantId: z.string().min(1),
  mode: z.enum(['test', 'live']).optional(),
  enabled: z.boolean().optional(),
  /** Visible settings, all of them each time */
  public: z.record(z.string(), z.string().max(500)).default({}),
  /** Only the secrets being replaced; an empty value keeps the saved one */
  secrets: z.record(z.string(), z.string().max(2000)).default({}),
})
export type SaveConnectorInput = z.infer<typeof saveConnectorSchema>

export const connectorAllowedSchema = z.object({ allowed: z.boolean() })

export type ConnectorAvailability = {
  inPlan: boolean
  /** Switched off by our team on the Connectors tab */
  blocked: boolean
  /** Has code in this release (SMS waits) */
  available: boolean
  /** May be connected and used */
  allowed: boolean
}

export function connectorAvailability(
  provider: ConnectorProvider,
  plan: Pick<Plan, 'allowedConnectors'> | null,
  tenant: Pick<Tenant, 'blockedConnectors'>,
): ConnectorAvailability {
  const available =
    provider.phase === 'mvp' && (provider.alwaysOn || provider.key in CONNECTOR_IMPLEMENTATIONS)
  const inPlan =
    Boolean(provider.alwaysOn) ||
    (plan?.allowedConnectors ?? []).includes(provider.key as ConnectorProviderKey)
  const blocked = (tenant.blockedConnectors ?? []).includes(provider.key as ConnectorProviderKey)
  return { inPlan, blocked, available, allowed: available && inPlan && !blocked }
}

async function loadTenant(payload: Payload, tenantId: string, req?: PayloadRequest) {
  const tenant = await payload
    .findByID({ collection: 'tenants', id: tenantId, depth: 1, overrideAccess: true, req })
    .catch(() => null)
  if (!tenant) throw new AppError('NOT_FOUND', 'Store not found', 404)
  const plan = tenant.plan && typeof tenant.plan === 'object' ? tenant.plan : null
  return { tenant, plan }
}

async function findConfig(
  payload: Payload,
  tenantId: string,
  provider: string,
  req?: PayloadRequest,
): Promise<ConnectorConfig | null> {
  const { docs } = await payload.find({
    collection: 'connector-configs',
    where: { and: [{ tenant: { equals: tenantId } }, { provider: { equals: provider } }] },
    limit: 1,
    depth: 0,
    // Inside a transaction: a paginated find counts in parallel, which Mongo refuses
    pagination: false,
    overrideAccess: true,
    req,
  })
  return docs[0] ?? null
}

/** The sealed secret, read past field access. Server only. */
async function sealedSecretOf(
  payload: Payload,
  configId: string,
  req?: PayloadRequest,
): Promise<string | null> {
  const value = await readHiddenField(payload, {
    collection: 'connector-configs',
    id: configId,
    field: 'secretSealed',
    req,
  })
  return typeof value === 'string' ? value : null
}

/**
 * Who may enter keys: the store owner, or our super admin while managing the store (docs/05:
 * keys are owner-only; super admins set up WhatsApp with the vendor during onboarding).
 */
export function assertCanEditConnectors(req: PayloadRequest, tenantId: string) {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 'Sign in first', 401)
  const session = storeSessionOf(req.user)
  if (session) {
    if (session.tenantId === tenantId && session.mode === 'manage') return
    throw new AppError('FORBIDDEN', 'Open this store with “Manage store” to change its keys', 403)
  }
  if (!hasTenantRole(req.user, tenantId, ['owner'])) {
    throw new AppError('FORBIDDEN', 'Only the store owner changes payment and messaging keys', 403)
  }
}

function cleanPublic(provider: ConnectorProvider, input: Record<string, string>) {
  const values: Record<string, string> = {}
  const fields: Record<string, string> = {}
  for (const field of provider.fields.filter((item) => !item.secret)) {
    const value = (input[field.key] ?? '').trim()
    if (!value) {
      if (field.required) fields[field.key] = `Enter the ${field.label.toLowerCase()}`
      continue
    }
    if (field.pattern && !new RegExp(field.pattern.source).test(value)) {
      fields[field.key] = field.pattern.message
      continue
    }
    if (field.options && !field.options.some((option) => option.value === value)) {
      fields[field.key] = 'Pick one of the choices'
      continue
    }
    values[field.key] = value
  }
  return { values, fields }
}

export const webhookUrlFor = (provider: ConnectorProvider, tenantId: string) =>
  provider.webhookPath
    ? `${env.ADMIN_URL.replace(/\/$/, '')}/api/webhooks/${provider.webhookPath}/${tenantId}`
    : null

/** Saves a store's settings and keys for one provider (Payments, Shipping, WhatsApp and SMS). */
export async function saveConnector(
  req: PayloadRequest,
  providerKey: string,
  input: SaveConnectorInput,
): Promise<{ id: string; savedSecrets: string[] }> {
  if (!isConnectorProviderKey(providerKey)) throw new AppError('NOT_FOUND', 'Unknown provider', 404)
  const { tenantId } = input
  assertCanEditConnectors(req, tenantId)
  const provider = getConnectorProvider(providerKey)
  const { tenant, plan } = await loadTenant(req.payload, tenantId, req)
  const availability = connectorAvailability(provider, plan, tenant)
  if (!availability.allowed || provider.alwaysOn) {
    throw new AppError(
      'FEATURE_NOT_IN_PLAN',
      availability.available
        ? `${provider.label} isn’t switched on for this store. Ask the platform team.`
        : `${provider.label} isn’t available yet.`,
      422,
    )
  }

  const { values, fields } = cleanPublic(provider, input.public)
  const existing = await findConfig(req.payload, tenantId, providerKey, req)
  const savedSecrets = existing
    ? decryptSecret(await sealedSecretOf(req.payload, existing.id, req))
    : {}
  const secrets = { ...savedSecrets }
  const replaced: string[] = []
  for (const field of provider.fields.filter((item) => item.secret)) {
    const value = (input.secrets[field.key] ?? '').trim()
    if (value) {
      secrets[field.key] = value
      replaced.push(field.key)
    }
    if (field.required && !secrets[field.key])
      fields[field.key] = `Enter the ${field.label.toLowerCase()}`
  }
  if (Object.keys(fields).length) {
    throw new AppError('VALIDATION_FAILED', 'Check the highlighted fields', 400, fields)
  }

  // A WhatsApp number can belong to one store only: it routes Meta's webhooks (docs/09)
  const routingKey = providerKey === 'meta-whatsapp' ? values.phoneNumberId : undefined
  if (routingKey) {
    const { totalDocs } = await req.payload.count({
      collection: 'connector-configs',
      where: {
        and: [{ routingKey: { equals: routingKey } }, { tenant: { not_equals: tenantId } }],
      },
      overrideAccess: true,
      req,
    })
    if (totalDocs > 0) {
      throw new AppError(
        'CONFLICT',
        'This WhatsApp number is already connected to another store',
        409,
        {
          phoneNumberId: 'Already connected to another store',
        },
      )
    }
  }

  const userId = req.user?.collection === 'users' ? req.user.id : undefined
  const changedPublic = Object.keys({ ...(existing?.publicConfig as object), ...values }).filter(
    (key) => (existing?.publicConfig as Record<string, string> | undefined)?.[key] !== values[key],
  )
  const mode: ConnectorMode = input.mode ?? (existing?.mode as ConnectorMode | undefined) ?? 'live'
  const data = {
    tenant: tenantId,
    provider: providerKey,
    kind: provider.kind,
    enabled: input.enabled ?? existing?.enabled ?? true,
    mode,
    publicConfig: values,
    savedSecrets: Object.keys(secrets).filter((key) => secrets[key]),
    routingKey: routingKey ?? null,
    webhookToken:
      existing?.webhookToken ??
      (provider.generatesWebhookToken ? randomBytes(24).toString('base64url') : null),
    updatedBy: userId,
    // New keys deserve a fresh check before anyone trusts the old result
    ...(replaced.length || changedPublic.length || mode !== existing?.mode
      ? {
          health: {
            ...existing?.health,
            lastTestAt: null,
            lastTestOk: null,
            lastTestMessage: null,
          },
        }
      : {}),
  }
  const saved = existing
    ? await req.payload.update({
        collection: 'connector-configs',
        id: existing.id,
        data,
        overrideAccess: true,
        req,
      })
    : await req.payload.create({
        collection: 'connector-configs',
        data: { ...data, connectedBy: userId, connectedAt: new Date().toISOString() },
        overrideAccess: true,
        req,
      })
  // Written past field access: nobody, not even our own API, reads or writes it otherwise
  await writeHiddenFields(req, {
    collection: 'connector-configs',
    id: saved.id,
    set: { secretSealed: encryptSecret(secrets) },
  })
  await recordAudit(req, {
    action: 'connector_changed',
    tenant: tenantId,
    summary: `${existing ? 'Updated' : 'Connected'} ${provider.label}${
      replaced.length ? ` (replaced ${replaced.join(', ')})` : ''
    }`,
    collectionSlug: 'connector-configs',
    docId: String(saved.id),
    // Names only, never values (docs/14)
    diff: { provider: providerKey, mode, public: changedPublic, secretsReplaced: replaced },
  })
  return { id: String(saved.id), savedSecrets: data.savedSecrets }
}

/** The store's connector with its decrypted keys, for server code that calls the provider. */
export async function loadConnector(
  payload: Payload,
  tenantId: string,
  providerKey: ConnectorProviderKey,
  { requireAllowed = true, req }: { requireAllowed?: boolean; req?: PayloadRequest } = {},
): Promise<(ConnectorContext & { config: ConnectorConfig }) | null> {
  const config = await findConfig(payload, tenantId, providerKey, req)
  if (!config || !config.enabled) return null
  if (requireAllowed) {
    const { tenant, plan } = await loadTenant(payload, tenantId, req)
    if (!connectorAvailability(getConnectorProvider(providerKey), plan, tenant).allowed) return null
  }
  return {
    tenantId,
    provider: providerKey,
    mode: (config.mode as ConnectorMode | null) ?? 'live',
    public: (config.publicConfig as Record<string, string> | null) ?? {},
    secret: decryptSecret(await sealedSecretOf(payload, config.id, req)),
    config,
  }
}

/** "Test connection": a harmless authenticated call, its result kept as the connector's health. */
export async function testConnector(
  req: PayloadRequest,
  providerKey: string,
  tenantId: string,
  fetchImpl?: typeof fetch,
): Promise<TestResult> {
  if (!isConnectorProviderKey(providerKey)) throw new AppError('NOT_FOUND', 'Unknown provider', 404)
  assertCanEditConnectors(req, tenantId)
  const implementation = CONNECTOR_IMPLEMENTATIONS[providerKey]
  const ctx = await loadConnector(req.payload, tenantId, providerKey, { req })
  if (!implementation || !ctx) {
    throw new AppError('BUSINESS_RULE', 'Save the keys first, then test the connection', 422)
  }
  let result: TestResult
  try {
    result = await implementation.testCredentials({ ...ctx, fetchImpl })
  } catch (error) {
    if (!(error instanceof ProviderUnreachable)) throw error
    result = { ok: false, message: `${error.message}. Try again in a minute.` }
  }
  const now = new Date().toISOString()
  await req.payload.update({
    collection: 'connector-configs',
    id: ctx.config.id,
    data: {
      health: {
        ...ctx.config.health,
        lastTestAt: now,
        lastTestOk: result.ok,
        lastTestMessage: result.message,
        ...(result.details ? { details: result.details } : {}),
        ...(result.ok ? {} : { lastErrorAt: now, lastError: result.message }),
      },
    },
    overrideAccess: true,
    req,
  })
  return result
}

/** Our team's "Allowed" switch on the Connectors tab, capped by the plan. */
export async function setConnectorAllowed(
  req: PayloadRequest,
  tenantId: string,
  providerKey: string,
  allowed: boolean,
) {
  if (!isSuperAdmin(req.user)) throw new AppError('FORBIDDEN', 'Super admins only', 403)
  if (!isConnectorProviderKey(providerKey)) throw new AppError('NOT_FOUND', 'Unknown provider', 404)
  const provider = getConnectorProvider(providerKey)
  const { tenant, plan } = await loadTenant(req.payload, tenantId, req)
  const availability = connectorAvailability(provider, plan, tenant)
  if (provider.alwaysOn) throw new AppError('BUSINESS_RULE', `${provider.label} is always on`, 422)
  if (allowed && !availability.inPlan) {
    throw new AppError(
      'FEATURE_NOT_IN_PLAN',
      `The ${plan?.name ?? 'store’s'} plan doesn’t include ${provider.label}. Change the plan first.`,
      422,
    )
  }
  const blocked = new Set(tenant.blockedConnectors ?? [])
  if (allowed) blocked.delete(providerKey)
  else blocked.add(providerKey)
  await req.payload.update({
    collection: 'tenants',
    id: tenantId,
    data: { blockedConnectors: [...blocked] },
    // Field access keeps the list out of the REST API; this service is its one writer
    overrideAccess: true,
    req,
  })
  await recordAudit(req, {
    action: 'connector_changed',
    tenant: tenantId,
    summary: `${allowed ? 'Allowed' : 'Switched off'} ${provider.label}`,
    diff: { provider: providerKey, allowed },
  })
  return { allowed: allowed && availability.available }
}

export type ConnectorSummary = {
  provider: ConnectorProvider
  availability: ConnectorAvailability
  connected: boolean
  enabled: boolean
  mode: ConnectorMode | null
  /** Visible settings as saved; masked where they look like keys */
  publicValues: Record<string, string>
  maskedPublic: Record<string, string>
  savedSecrets: string[]
  webhookUrl: string | null
  webhookToken: string | null
  health: ConnectorConfig['health'] | null
  connectedByName: string | null
  connectedAt: string | null
}

/** Every provider for one store, for the Connectors tab and the vendor's setup screens. */
export async function connectorOverview(
  payload: Payload,
  tenantId: string,
): Promise<{ tenant: Tenant; plan: Plan | null; connectors: ConnectorSummary[] }> {
  const { tenant, plan } = await loadTenant(payload, tenantId)
  const { docs } = await payload.find({
    collection: 'connector-configs',
    where: { tenant: { equals: tenantId } },
    depth: 1,
    limit: 50,
    pagination: false,
    overrideAccess: true,
  })
  const byProvider = new Map(docs.map((doc) => [doc.provider, doc]))
  const connectors = CONNECTOR_PROVIDERS.map((provider): ConnectorSummary => {
    const config = byProvider.get(provider.key)
    const publicValues = (config?.publicConfig as Record<string, string> | null) ?? {}
    const by = config?.connectedBy
    return {
      provider,
      availability: connectorAvailability(provider, plan, tenant),
      connected: Boolean(config),
      enabled: Boolean(config?.enabled),
      mode: (config?.mode as ConnectorMode | null) ?? null,
      publicValues,
      maskedPublic: Object.fromEntries(
        Object.entries(publicValues).map(([key, value]) => [
          key,
          /key|id$/i.test(key) && value.length > 8 ? maskValue(value) : value,
        ]),
      ),
      savedSecrets: config?.savedSecrets ?? [],
      webhookUrl: webhookUrlFor(provider, String(idOf(tenant.id))),
      webhookToken: config?.webhookToken ?? null,
      health: config?.health ?? null,
      connectedByName: by && typeof by === 'object' ? (by.name ?? by.email) : null,
      connectedAt: config?.connectedAt ?? null,
    }
  })
  return { tenant, plan, connectors }
}

/**
 * A webhook's outcome, kept as the connector's health (Connectors tab, Payments, the CMS banner):
 * a failure starts "failing since" and counts; a good one clears it.
 */
export async function recordWebhookHealth(
  payload: Payload,
  tenantId: string,
  providerKey: ConnectorProviderKey,
  outcome: { ok: true } | { ok: false; error: string },
): Promise<void> {
  const config = await findConfig(payload, tenantId, providerKey)
  if (!config) return
  const now = new Date().toISOString()
  const health = config.health ?? {}
  await payload.update({
    collection: 'connector-configs',
    id: config.id,
    data: {
      health: outcome.ok
        ? {
            ...health,
            lastWebhookAt: now,
            lastWebhookOkAt: now,
            failingSince: null,
            failedCount: 0,
          }
        : {
            ...health,
            lastWebhookAt: now,
            failingSince: health.failingSince ?? now,
            failedCount: (health.failedCount ?? 0) + 1,
            lastErrorAt: now,
            lastError: outcome.error,
          },
    },
    overrideAccess: true,
  })
}

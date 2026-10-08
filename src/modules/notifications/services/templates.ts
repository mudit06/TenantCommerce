import type { Payload, PayloadRequest } from 'payload'

import { loadConnector, recordWebhookHealth, whatsappApi } from '@/connectors'
import { AppError } from '@/lib/errors'
import type { NotificationTemplate } from '@/payload-types'

import { isMarketingKey, MARKETING_KEYS, MARKETING_TEMPLATES } from '../marketing'
import { MILESTONES, type MilestoneKey } from '../milestones'
import { sampleFacts } from '../render'
import {
  starterFor,
  STARTER_TEMPLATES,
  type Variant,
  whatsappTemplateName,
  withStoreName,
} from '../starter-templates'
import { messageVariables } from '../variables'
import { assertNotificationAccess } from './access'
import { storeFacts } from './store'

// WhatsApp templates per vendor (docs/18 "Templates"): seeded from the starter library, submitted
// to Meta from the WhatsApp screen, and their approval read back by "Sync templates" or Meta's
// template webhook. A step goes out on WhatsApp only once its template is approved.

const LANGUAGE = 'en'

export async function storeTemplates(
  payload: Payload,
  tenantId: string,
  req?: PayloadRequest,
): Promise<NotificationTemplate[]> {
  const { docs } = await payload.find({
    collection: 'notification-templates',
    where: { and: [{ tenant: { equals: tenantId } }, { channel: { equals: 'whatsapp' } }] },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  return docs
}

export async function templateFor(
  payload: Payload,
  tenantId: string,
  milestone: MilestoneKey,
  variant: Variant,
  req?: PayloadRequest,
): Promise<NotificationTemplate | null> {
  const { docs } = await payload.find({
    collection: 'notification-templates',
    where: {
      and: [
        { tenant: { equals: tenantId } },
        { channel: { equals: 'whatsapp' } },
        { milestone: { equals: milestone } },
        { variant: { equals: variant } },
        { locale: { equals: LANGUAGE } },
      ],
    },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  return docs[0] ?? null
}

/** Every step and variant the starter library has, as WhatsApp drafts in the store's name */
export async function ensureStarterTemplates(req: PayloadRequest, tenantId: string) {
  const { storeName } = await storeFacts(req.payload, tenantId, req)
  const existing = await storeTemplates(req.payload, tenantId, req)
  const have = new Set(existing.map((t) => `${t.milestone}:${t.variant}`))
  let created = 0
  for (const milestone of MILESTONES) {
    for (const variant of Object.keys(STARTER_TEMPLATES[milestone.key]) as Variant[]) {
      if (have.has(`${milestone.key}:${variant}`)) continue
      const starter = starterFor(milestone.key, variant).whatsapp
      await req.payload.create({
        collection: 'notification-templates',
        data: {
          tenant: tenantId,
          milestone: milestone.key,
          variant,
          channel: 'whatsapp',
          category: 'utility',
          locale: LANGUAGE,
          body: withStoreName(starter.body, storeName),
          variables: starter.variables,
          trackButton: starter.trackButton,
          whatsapp: { name: whatsappTemplateName(milestone.key, variant), language: LANGUAGE },
          status: 'draft',
        },
        overrideAccess: true,
        req,
      })
      created++
    }
  }
  // Offers and cart reminders: marketing templates, separate from order updates (../marketing.ts)
  for (const key of MARKETING_KEYS) {
    if (have.has(`${key}:default`)) continue
    const template = MARKETING_TEMPLATES[key]
    await req.payload.create({
      collection: 'notification-templates',
      data: {
        tenant: tenantId,
        milestone: key,
        variant: 'default',
        channel: 'whatsapp',
        category: 'marketing',
        locale: LANGUAGE,
        body: withStoreName(template.body, storeName),
        variables: [...template.variables],
        trackButton: true,
        whatsapp: { name: key, language: LANGUAGE },
        status: 'draft',
      },
      overrideAccess: true,
      req,
    })
    created++
  }
  return created
}

async function whatsappContext(req: PayloadRequest, tenantId: string, fetchImpl?: typeof fetch) {
  const ctx = await loadConnector(req.payload, tenantId, 'meta-whatsapp', { req })
  if (!ctx) {
    throw new AppError('CONFLICT', 'Connect WhatsApp first, on the WhatsApp and SMS screen', 409)
  }
  return { ...ctx, fetchImpl }
}

/**
 * Submits every draft or rejected template to Meta for approval, with sample values for each
 * variable. Owner only, like the WhatsApp keys. Meta usually answers within a day.
 */
export async function submitTemplates(
  req: PayloadRequest,
  tenantId: string,
  { fetchImpl }: { fetchImpl?: typeof fetch } = {},
) {
  assertNotificationAccess(req, tenantId, 'settings')
  await ensureStarterTemplates(req, tenantId)
  const ctx = await whatsappContext(req, tenantId, fetchImpl)
  const store = await storeFacts(req.payload, tenantId, req)
  const templates = (await storeTemplates(req.payload, tenantId, req)).filter((t) =>
    ['draft', 'rejected'].includes(t.status ?? 'draft'),
  )
  const results: { name: string; ok: boolean; message?: string }[] = []
  for (const template of templates) {
    const variant = (template.variant ?? 'default') as Variant
    const marketing = isMarketingKey(template.milestone)
      ? MARKETING_TEMPLATES[template.milestone]
      : null
    const values = messageVariables(sampleFacts(store, variant))
    const samples = marketing
      ? [...marketing.samples]
      : (template.variables ?? []).map((key) => values[key as keyof typeof values])
    const name =
      template.whatsapp?.name ||
      (marketing
        ? template.milestone
        : whatsappTemplateName(template.milestone as MilestoneKey, variant))
    const outcome = await whatsappApi.createTemplate(ctx, {
      name,
      language: template.whatsapp?.language || LANGUAGE,
      category: marketing ? 'MARKETING' : 'UTILITY',
      body: template.body,
      samples,
      trackUrlBase: marketing
        ? `${store.storeOrigin}/`
        : template.trackButton
          ? `${store.storeOrigin}/t/`
          : null,
      trackSample: marketing?.buttonSample,
      buttonText: marketing?.button,
    })
    await req.payload.update({
      collection: 'notification-templates',
      id: template.id,
      data: outcome.ok
        ? {
            status: whatsappApi.templateStatusOf(outcome.status) as NotificationTemplate['status'],
            whatsapp: { ...template.whatsapp, name, providerTemplateId: outcome.id },
            rejectionReason: null,
            submittedAt: new Date().toISOString(),
          }
        : { rejectionReason: outcome.message.slice(0, 200) },
      overrideAccess: true,
      req,
    })
    results.push({ name, ok: outcome.ok, message: outcome.ok ? undefined : outcome.message })
  }
  return { submitted: results.filter((r) => r.ok).length, results }
}

/** Reads every template's status back from Meta ("Sync templates") */
export async function syncTemplates(
  req: PayloadRequest,
  tenantId: string,
  { fetchImpl }: { fetchImpl?: typeof fetch } = {},
) {
  assertNotificationAccess(req, tenantId, 'settings')
  const ctx = await whatsappContext(req, tenantId, fetchImpl)
  const remote = await whatsappApi.listTemplates(ctx).catch((error: unknown) => {
    throw new AppError(
      'BUSINESS_RULE',
      `Meta didn’t list the templates: ${error instanceof Error ? error.message : 'unknown error'}`,
      502,
    )
  })
  let updated = 0
  for (const template of await storeTemplates(req.payload, tenantId, req)) {
    const match = remote.find(
      (row) =>
        row.name === template.whatsapp?.name &&
        row.language === (template.whatsapp?.language || LANGUAGE),
    )
    if (!match) continue
    await req.payload.update({
      collection: 'notification-templates',
      id: template.id,
      data: {
        status: whatsappApi.templateStatusOf(match.status) as NotificationTemplate['status'],
        rejectionReason: match.rejectedReason ?? null,
        whatsapp: { ...template.whatsapp, providerTemplateId: match.id },
        lastSyncedAt: new Date().toISOString(),
      },
      overrideAccess: true,
      req,
    })
    updated++
  }
  await recordWebhookHealth(req.payload, tenantId, 'meta-whatsapp', { ok: true }).catch(() => {})
  return { updated, onMeta: remote.length }
}

/** Meta's `message_template_status_update` webhook */
export async function applyTemplateEvent(
  req: PayloadRequest,
  tenantId: string,
  event: {
    name?: string
    language?: string
    id?: string | number
    event?: string
    reason?: string
  },
) {
  if (!event.name || !event.event) return false
  const { docs } = await req.payload.find({
    collection: 'notification-templates',
    where: {
      and: [
        { tenant: { equals: tenantId } },
        { 'whatsapp.name': { equals: event.name } },
        ...(event.language ? [{ 'whatsapp.language': { equals: event.language } }] : []),
      ],
    },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  const template = docs[0]
  if (!template) return false
  const reason = event.reason && event.reason !== 'NONE' ? event.reason : null
  await req.payload.update({
    collection: 'notification-templates',
    id: template.id,
    data: {
      status: whatsappApi.templateStatusOf(event.event) as NotificationTemplate['status'],
      rejectionReason: reason,
      lastSyncedAt: new Date().toISOString(),
      ...(event.id
        ? { whatsapp: { ...template.whatsapp, providerTemplateId: String(event.id) } }
        : {}),
    },
    overrideAccess: true,
    req,
  })
  return true
}

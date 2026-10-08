import type { Payload, PayloadRequest, Where } from 'payload'
import { z } from 'zod'

import { hasTenantRole, idOf, storeSessionOf, type TenantRole } from '@/access'
import { editorName } from '@/fields/editedBy'
import { AppError } from '@/lib/errors'
import { isFeatureEnabled, requireFeature } from '@/modules/tenancy'
import type { OfferCampaign } from '@/payload-types'

import { insideWindow, offerConfig, offersThisWeek, unsubscribeToken } from './offers'
import { queuePreparedEmail, queuePreparedWhatsApp } from './prepared'
import { storeFacts } from './store'

// Offer messages (docs/screens Offer messages): only to shoppers who ticked the offers box for
// that channel, after unsubscribes, bounces and the weekly cap, inside the send window. Staff
// can't add or import people (rule 1).

const CAMPAIGN_ROLES: readonly TenantRole[] = ['owner', 'manager', 'content-editor']

export async function assertCampaignAccess(
  req: PayloadRequest,
  tenantId: string,
  what: 'read' | 'write' | 'settings',
) {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 'Sign in first', 401)
  const session = storeSessionOf(req.user)
  if (session) {
    if (session.tenantId !== tenantId || (what !== 'read' && session.mode !== 'manage')) {
      throw new AppError(
        'FORBIDDEN',
        'Open this store with “Manage store” to change offer messages',
        403,
      )
    }
  } else if (
    !hasTenantRole(
      req.user,
      tenantId,
      what === 'settings'
        ? ['owner', 'manager']
        : [...CAMPAIGN_ROLES, ...(what === 'read' ? (['support'] as const) : [])],
    )
  ) {
    throw new AppError('FORBIDDEN', 'Your role can’t do this', 403)
  }
  await requireFeature(req.payload, tenantId, 'offer-messages')
}

export const campaignInputSchema = z.object({
  title: z.string().trim().min(2, 'Name the message').max(120),
  scheme: z.string().nullable().optional(),
  subject: z.string().trim().min(2, 'Write the email subject').max(120),
  headline: z.string().trim().min(5, 'Say what the offer is').max(240),
  detail: z.string().trim().max(160).optional(),
  buttonLabel: z.string().trim().min(2).max(30).default('Shop the offer'),
  linkPath: z
    .string()
    .trim()
    .regex(/^[a-z0-9/_-]*$/i, 'A page of the store, like offers/diwali-2026')
    .max(120)
    .default('offers'),
  audience: z.enum(['all', 'wishlist', 'lapsed']).default('all'),
  channels: z.array(z.enum(['email', 'whatsapp'])).min(1, 'Choose at least one channel'),
  sendAt: z.string().datetime(),
})
export type CampaignInput = z.input<typeof campaignInputSchema>

async function own(req: PayloadRequest, tenantId: string, id: string): Promise<OfferCampaign> {
  const { docs } = await req.payload.find({
    collection: 'offer-campaigns',
    where: { and: [{ tenant: { equals: tenantId } }, { id: { equals: id } }] },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  if (!docs[0]) throw new AppError('NOT_FOUND', 'Message not found', 404)
  return docs[0]
}

async function schemeName(
  req: PayloadRequest,
  tenantId: string,
  schemeId: string | null | undefined,
) {
  if (!schemeId) return null
  const { docs } = await req.payload.find({
    collection: 'schemes',
    where: { and: [{ tenant: { equals: tenantId } }, { id: { equals: schemeId } }] },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { name: true },
    req,
  })
  return docs[0]?.name ?? null
}

export async function saveCampaign(
  req: PayloadRequest,
  tenantId: string,
  input: CampaignInput,
  id?: string | null,
) {
  const data = campaignInputSchema.parse(input)
  const whatsappOn = await isFeatureEnabled(req.payload, tenantId, 'whatsapp-offers')
  const channels = data.channels.filter((c) => c === 'email' || whatsappOn)
  if (!channels.length)
    throw new AppError('VALIDATION_FAILED', 'Choose email', 400, { channels: 'Choose email' })
  const fields = {
    ...data,
    channels,
    scheme: data.scheme || null,
    schemeName: await schemeName(req, tenantId, data.scheme),
    detail: data.detail || null,
  }
  if (id) {
    const existing = await own(req, tenantId, id)
    if (existing.status !== 'draft' && existing.status !== 'scheduled') {
      throw new AppError('INVALID_TRANSITION', 'A message that went out can’t change', 409)
    }
    return req.payload.update({
      collection: 'offer-campaigns',
      id: existing.id,
      data: fields,
      overrideAccess: true,
      req,
    })
  }
  return req.payload.create({
    collection: 'offer-campaigns',
    data: {
      tenant: tenantId,
      ...fields,
      status: 'draft',
      createdBy: editorName(req.user) ?? undefined,
    },
    overrideAccess: true,
    req,
  })
}

/** Schedule (at the send time, moved into the window) or cancel a message not sent yet. */
export async function setCampaignStatus(
  req: PayloadRequest,
  tenantId: string,
  id: string,
  action: 'schedule' | 'cancel',
) {
  const campaign = await own(req, tenantId, id)
  if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
    throw new AppError('INVALID_TRANSITION', 'This message has already gone out', 409)
  }
  if (action === 'cancel') {
    return req.payload.update({
      collection: 'offer-campaigns',
      id: campaign.id,
      data: { status: 'cancelled' },
      overrideAccess: true,
      req,
    })
  }
  const config = await offerConfig(req.payload, tenantId, req)
  const at = new Date(Math.max(Date.now(), new Date(campaign.sendAt).getTime()))
  const sendAt = config ? insideWindow(at, config.sendWindow) : at
  return req.payload.update({
    collection: 'offer-campaigns',
    id: campaign.id,
    data: { status: 'scheduled', sendAt: sendAt.toISOString() },
    overrideAccess: true,
    req,
  })
}

// ---- Audience ---------------------------------------------------------------------------

export type Recipient = { channel: 'email' | 'whatsapp'; to: string; firstName: string | null }

/** Products a scheme covers, for "shoppers with these products in their wishlist" */
async function schemeProducts(
  payload: Payload,
  tenantId: string,
  schemeId: string,
): Promise<string[] | null> {
  const { docs } = await payload.find({
    collection: 'schemes',
    where: { and: [{ tenant: { equals: tenantId } }, { id: { equals: schemeId } }] },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  const scheme = docs[0]
  if (!scheme) return []
  const ids = (list: unknown) =>
    ((Array.isArray(list) ? list : []) as unknown[])
      .map((v) => idOf(v))
      .filter((v): v is string => Boolean(v))
  if (scheme.offer?.type === 'special-price')
    return ids((scheme.offer.specialPrices ?? []).map((r) => r.product))
  const mode = scheme.appliesTo?.mode ?? 'all'
  if (mode === 'all') return null
  if (mode === 'products') return ids(scheme.appliesTo?.products)
  const roots = ids(scheme.appliesTo?.categories)
  const { docs: categories } = await payload.find({
    collection: 'categories',
    where: { tenant: { equals: tenantId } },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { parent: true },
  })
  const all = new Set(roots)
  let grew = true
  while (grew) {
    grew = false
    for (const c of categories) {
      const parent = idOf(c.parent)
      if (parent && all.has(parent) && !all.has(String(c.id))) {
        all.add(String(c.id))
        grew = true
      }
    }
  }
  const { docs: products } = await payload.find({
    collection: 'products',
    where: {
      and: [
        { tenant: { equals: tenantId } },
        { or: [{ primaryCategory: { in: [...all] } }, { categories: { in: [...all] } }] },
      ],
    },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { slug: true },
  })
  return products.map((p) => String(p.id))
}

/**
 * Who gets the message: addresses that agreed to offers on each chosen channel (not
 * suppressed), narrowed to wishlists when asked, with first names from accounts.
 */
export async function campaignAudience(
  req: PayloadRequest,
  tenantId: string,
  campaign: Pick<OfferCampaign, 'channels' | 'audience' | 'scheme'>,
): Promise<{ recipients: Recipient[]; capped: number }> {
  const whatsappOn = await isFeatureEnabled(req.payload, tenantId, 'whatsapp-offers')
  const channels = (campaign.channels ?? []).filter((c) => c === 'email' || whatsappOn)
  const config = await offerConfig(req.payload, tenantId, req)
  const where = (channel: 'email' | 'whatsapp'): Where => ({
    and: [
      { tenant: { equals: tenantId } },
      { type: { equals: channel === 'email' ? 'email' : 'phone' } },
      { [`offers.${channel}.optedIn`]: { equals: true } },
      { 'suppressed.reason': { exists: false } },
    ],
  })
  let narrowTo: { emails: Set<string>; phones: Set<string> } | null = null
  if (campaign.audience === 'wishlist') {
    const products = campaign.scheme
      ? await schemeProducts(req.payload, tenantId, campaign.scheme)
      : null
    const { docs: lists } = await req.payload.find({
      collection: 'wishlists',
      where: {
        and: [
          { tenant: { equals: tenantId } },
          ...(products
            ? [{ 'items.product': { in: products } }]
            : [{ 'items.0': { exists: true } }]),
        ],
      },
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { customer: true },
      req,
    })
    const { docs: shoppers } = lists.length
      ? await req.payload.find({
          collection: 'customers',
          where: {
            and: [{ tenant: { equals: tenantId } }, { id: { in: lists.map((l) => l.customer) } }],
          },
          depth: 0,
          pagination: false,
          overrideAccess: true,
          select: { email: true, phone: true },
          req,
        })
      : { docs: [] }
    narrowTo = {
      emails: new Set(shoppers.map((c) => c.email)),
      phones: new Set(shoppers.map((c) => c.phone).filter((p): p is string => Boolean(p))),
    }
  }
  // "No order in the last 90 days": addresses with a recent order are left out
  let recent: Set<string> | null = null
  if (campaign.audience === 'lapsed') {
    const { docs: orders } = await req.payload.find({
      collection: 'orders',
      where: {
        and: [
          { tenant: { equals: tenantId } },
          { status: { not_in: ['pending', 'cancelled'] } },
          { placedAt: { greater_than: new Date(Date.now() - 90 * 86_400_000).toISOString() } },
        ],
      },
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { contact: true },
      req,
    })
    recent = new Set(
      orders.flatMap((o) =>
        [o.contact?.email?.toLowerCase(), o.contact?.phone].filter((v): v is string => Boolean(v)),
      ),
    )
  }
  const recipients: Recipient[] = []
  let capped = 0
  for (const channel of channels) {
    const { docs } = await req.payload.find({
      collection: 'contact-preferences',
      where: where(channel),
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { value: true },
      req,
    })
    for (const pref of docs) {
      if (narrowTo && !(channel === 'email' ? narrowTo.emails : narrowTo.phones).has(pref.value))
        continue
      if (recent?.has(pref.value)) continue
      if (
        config &&
        (await offersThisWeek(req, tenantId, pref.value)) >= config.maxPerShopperPerWeek
      ) {
        capped += 1
        continue
      }
      recipients.push({ channel, to: pref.value, firstName: null })
    }
  }
  // First names from accounts, when the address has one
  if (recipients.length) {
    const { docs: accounts } = await req.payload.find({
      collection: 'customers',
      where: {
        and: [
          { tenant: { equals: tenantId } },
          {
            or: [
              { email: { in: recipients.map((r) => r.to) } },
              { phone: { in: recipients.map((r) => r.to) } },
            ],
          },
        ],
      },
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { email: true, phone: true, name: true },
      req,
    })
    const nameOf = new Map<string, string>()
    for (const a of accounts) {
      const first = a.name?.split(' ')[0]
      if (!first) continue
      nameOf.set(a.email, first)
      if (a.phone) nameOf.set(a.phone, first)
    }
    for (const r of recipients) r.firstName = nameOf.get(r.to) ?? null
  }
  return { recipients, capped }
}

/** Queues one message per recipient. Called by the send job when the time comes. */
export async function sendCampaign(req: PayloadRequest, campaign: OfferCampaign) {
  const tenantId = idOf(campaign.tenant)!
  await req.payload.update({
    collection: 'offer-campaigns',
    id: campaign.id,
    data: { status: 'sending' },
    overrideAccess: true,
    req,
  })
  const store = await storeFacts(req.payload, tenantId, req)
  const config = await offerConfig(req.payload, tenantId, req)
  const sendAfter = config ? insideWindow(new Date(), config.sendWindow) : new Date()
  const { recipients, capped } = await campaignAudience(req, tenantId, campaign)
  let email = 0
  let whatsapp = 0
  const link = `${store.storeOrigin}/${(campaign.linkPath ?? 'offers').replace(/^\/+/, '')}`
  for (const r of recipients) {
    if (r.channel === 'email') {
      const log = await queuePreparedEmail(req, {
        tenantId,
        kind: 'offer',
        milestone: 'offer_message',
        to: r.to,
        dedupeKey: `offer:${campaign.id}:email:${r.to}`,
        sendAfter,
        check: { consent: { type: 'email', value: r.to, channel: 'email' } },
        email: {
          subject: campaign.subject,
          heading: campaign.title,
          paragraphs: [
            `Hi ${r.firstName ?? 'there'}, ${campaign.headline}.`,
            ...(campaign.detail ? [campaign.detail] : []),
            'Prices include GST. Offers end at the time shown on the store.',
          ],
          button: { label: campaign.buttonLabel || 'Shop the offer', url: link },
          footer: `You get this because you asked for offers from ${store.storeName} by email.`,
          unsubscribeUrl: `${store.storeOrigin}/u/${unsubscribeToken(tenantId, 'email', r.to)}`,
        },
      })
      if (log) email += 1
    } else {
      const log = await queuePreparedWhatsApp(req, {
        tenantId,
        kind: 'offer',
        milestone: 'offer_message',
        template: 'offer_message',
        to: r.to,
        dedupeKey: `offer:${campaign.id}:whatsapp:${r.to}`,
        params: [
          r.firstName ?? 'there',
          campaign.headline,
          campaign.detail || 'See the store for the end date.',
        ],
        buttonParam: (campaign.linkPath ?? 'offers').replace(/^\/+/, ''),
        sendAfter,
        check: { consent: { type: 'phone', value: r.to, channel: 'whatsapp' } },
      })
      if (log) whatsapp += 1
    }
  }
  return req.payload.update({
    collection: 'offer-campaigns',
    id: campaign.id,
    data: {
      status: 'sent',
      sentAt: new Date().toISOString(),
      stats: { email, whatsapp, skipped: capped },
    },
    overrideAccess: true,
    req,
  })
}

/** Campaigns whose time has come (the offer-campaigns job). */
export async function sendDueCampaigns(req: PayloadRequest) {
  const { docs } = await req.payload.find({
    collection: 'offer-campaigns',
    where: {
      and: [
        { status: { equals: 'scheduled' } },
        { sendAt: { less_than_equal: new Date().toISOString() } },
      ],
    },
    depth: 0,
    limit: 20,
    pagination: false,
    overrideAccess: true,
    req,
  })
  for (const campaign of docs) {
    const tenantId = idOf(campaign.tenant)!
    if (!(await isFeatureEnabled(req.payload, tenantId, 'offer-messages'))) {
      await req.payload.update({
        collection: 'offer-campaigns',
        id: campaign.id,
        data: { status: 'cancelled' },
        overrideAccess: true,
        req,
      })
      continue
    }
    await sendCampaign(req, campaign)
  }
  return docs.length
}

/** "Send test to me": the email version to the person's own address, now. */
export async function sendCampaignTest(
  req: PayloadRequest,
  tenantId: string,
  id: string,
  to: string,
) {
  const campaign = await own(req, tenantId, id)
  const store = await storeFacts(req.payload, tenantId, req)
  return queuePreparedEmail(req, {
    tenantId,
    kind: 'offer',
    milestone: 'offer_message',
    to,
    dedupeKey: `offer-test:${campaign.id}:${Date.now()}`,
    email: {
      subject: `[Test] ${campaign.subject}`,
      heading: campaign.title,
      paragraphs: [
        `Hi there, ${campaign.headline}.`,
        ...(campaign.detail ? [campaign.detail] : []),
      ],
      button: {
        label: campaign.buttonLabel || 'Shop the offer',
        url: `${store.storeOrigin}/${campaign.linkPath ?? 'offers'}`,
      },
      footer: 'A test of an offer message. Shoppers see an unsubscribe link here.',
    },
  })
}

/**
 * A scheme's "Tell shoppers" (docs/screens Scheme editor): a message scheduled for the scheme's
 * start, made once per scheme. Called by the promotions module when a scheme is scheduled.
 */
export async function scheduleSchemeMessage(
  req: PayloadRequest,
  tenantId: string,
  input: {
    schemeId: string
    schemeName: string
    headline: string
    detail: string
    linkPath: string
    startsAt: string
    channels: ('email' | 'whatsapp')[]
  },
) {
  if (!input.channels.length || !(await isFeatureEnabled(req.payload, tenantId, 'offer-messages')))
    return null
  const { docs } = await req.payload.find({
    collection: 'offer-campaigns',
    where: {
      and: [
        { tenant: { equals: tenantId } },
        { scheme: { equals: input.schemeId } },
        { status: { not_equals: 'cancelled' } },
      ],
    },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  if (docs[0]) return docs[0]
  const config = await offerConfig(req.payload, tenantId, req)
  const at = new Date(Math.max(Date.now(), new Date(input.startsAt).getTime()))
  return req.payload.create({
    collection: 'offer-campaigns',
    data: {
      tenant: tenantId,
      title: `${input.schemeName} starts today`,
      scheme: input.schemeId,
      schemeName: input.schemeName,
      subject: `${input.schemeName}: ${input.headline}`.slice(0, 120),
      headline: `our ${input.schemeName} is on: ${input.headline}`.slice(0, 240),
      detail: input.detail,
      buttonLabel: 'Shop the offer',
      linkPath: input.linkPath,
      audience: 'all',
      channels: input.channels,
      sendAt: (config ? insideWindow(at, config.sendWindow) : at).toISOString(),
      status: 'scheduled',
      createdBy: editorName(req.user) ?? 'Scheme',
    },
    overrideAccess: true,
    req,
  })
}

/** A paused or ended scheme's message that hasn't gone out is cancelled. */
export async function cancelSchemeMessage(req: PayloadRequest, tenantId: string, schemeId: string) {
  await req.payload.update({
    collection: 'offer-campaigns',
    where: {
      and: [
        { tenant: { equals: tenantId } },
        { scheme: { equals: schemeId } },
        { status: { in: ['draft', 'scheduled'] } },
      ],
    },
    data: { status: 'cancelled' },
    overrideAccess: true,
    req,
  })
}

export const offerSettingsSchema = z.object({
  maxPerShopperPerWeek: z.number().int().min(1).max(7),
  sendWindow: z.object({
    start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  }),
})

/** The store's send window and weekly cap, within the platform's limit (feature config). */
export async function saveOfferSettings(
  req: PayloadRequest,
  tenantId: string,
  input: z.infer<typeof offerSettingsSchema>,
) {
  const data = offerSettingsSchema.parse(input)
  if (data.sendWindow.end <= data.sendWindow.start) {
    throw new AppError('VALIDATION_FAILED', 'The window ends after it starts', 400, {
      sendWindow: 'Ends after it starts',
    })
  }
  const { docs } = await req.payload.find({
    collection: 'feature-flags',
    where: { and: [{ tenant: { equals: tenantId } }, { key: { equals: 'offer-messages' } }] },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  const flag = docs[0]
  if (!flag) throw new AppError('FEATURE_DISABLED', 'Not found', 404)
  return req.payload.update({
    collection: 'feature-flags',
    id: flag.id,
    data: { config: { ...((flag.config as object) ?? {}), ...data } },
    overrideAccess: false,
    user: req.user,
    req,
  })
}

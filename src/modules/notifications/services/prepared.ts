import type { Payload, PayloadRequest } from 'payload'

import { loadConnector, whatsappApi } from '@/connectors'
import { storeMessageEmail, type StoreMessageInput } from '@/emails/storeMessage'
import { env } from '@/lib/env'
import type { NotificationLog } from '@/payload-types'

import { fillMarketing, type MarketingKey } from '../marketing'
import { whatsappProviderFor, writeLog } from './engine'
import { offersAgreed, preferenceFor } from './preferences'
import { storeFacts } from './store'

// Messages other modules prepare (docs/18): review requests (reviews), offer messages and cart
// reminders (campaigns, cart). The caller checks consent and limits when it queues; consent and
// the cart are checked again when it sends, so an unsubscribe or an order in between stops it.
// One log row per message, deduped, through the same send job as order updates.

export type PreparedEmail = Omit<StoreMessageInput, 'storeName' | 'themeColor'>

export const PREPARED_KINDS = ['review', 'offer', 'cart', 'affiliate'] as const
export type PreparedKind = (typeof PREPARED_KINDS)[number]

/** Checked again at send time */
export type SendCheck = {
  /** Offers: the shopper must still agree to offers on this channel at this address */
  consent?: { type: 'email' | 'phone'; value: string; channel: 'email' | 'whatsapp' }
  /** Cart reminders: the cart must still be active with items, not ordered */
  cartId?: string
}

type PreparedWhatsApp = { template: MarketingKey; params: string[]; buttonParam: string }

type Stored = { email?: PreparedEmail; whatsapp?: PreparedWhatsApp; check?: SendCheck }

export async function queuePreparedEmail(
  req: PayloadRequest,
  input: {
    tenantId: string
    kind: PreparedKind
    milestone: string
    to: string
    dedupeKey: string
    orderId?: string | null
    sendAfter?: Date
    email: PreparedEmail
    check?: SendCheck
  },
): Promise<NotificationLog | null> {
  return writeLog(
    req,
    {
      tenant: input.tenantId,
      direction: 'out',
      kind: input.kind,
      milestone: input.milestone,
      channel: 'email',
      provider: env.RESEND_API_KEY ? 'resend' : 'dev-log',
      to: input.to.toLowerCase(),
      order: input.orderId ?? undefined,
      dedupeKey: input.dedupeKey,
      status: 'queued',
      // The message itself, rendered at send time in the store's name
      text: JSON.stringify({ email: input.email, check: input.check } satisfies Stored),
      preview: input.email.subject,
    },
    input.sendAfter,
  )
}

/**
 * A marketing WhatsApp message (offers, cart reminders) from the vendor's own number, using its
 * approved marketing template; printed to the server log when WhatsApp isn't connected locally.
 */
export async function queuePreparedWhatsApp(
  req: PayloadRequest,
  input: {
    tenantId: string
    kind: 'offer' | 'cart'
    milestone: string
    template: MarketingKey
    to: string
    dedupeKey: string
    params: string[]
    buttonParam: string
    sendAfter?: Date
    check?: SendCheck
  },
): Promise<NotificationLog | null> {
  const provider = await whatsappProviderFor(req, input.tenantId)
  const store = await storeFacts(req.payload, input.tenantId, req)
  return writeLog(
    req,
    {
      tenant: input.tenantId,
      direction: 'out',
      kind: input.kind,
      milestone: input.milestone,
      channel: 'whatsapp',
      provider: provider ?? undefined,
      to: input.to,
      dedupeKey: input.dedupeKey,
      status: provider ? 'queued' : 'skipped',
      skipReason: provider ? undefined : 'not_connected',
      text: JSON.stringify({
        whatsapp: {
          template: input.template,
          params: input.params,
          buttonParam: input.buttonParam,
        },
        check: input.check,
      } satisfies Stored),
      preview: fillMarketing(input.template, input.params, store.storeName),
    },
    input.sendAfter,
  )
}

async function stillWanted(payload: Payload, tenantId: string, check: SendCheck | undefined) {
  if (check?.consent) {
    const pref = await preferenceFor(payload, tenantId, check.consent.type, check.consent.value)
    if (!offersAgreed(pref, check.consent.channel)) return 'no_offer_consent' as const
  }
  if (check?.cartId) {
    const { docs } = await payload.find({
      collection: 'carts',
      where: { and: [{ tenant: { equals: tenantId } }, { id: { equals: check.cartId } }] },
      limit: 1,
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { status: true, items: true },
    })
    const cart = docs[0]
    if (!cart || cart.status !== 'active' || !(cart.items ?? []).length) return 'stale' as const
  }
  return null
}

/** Sends a prepared message (called by sendLog for review, offer and cart rows). */
export async function sendPrepared(
  payload: Payload,
  log: NotificationLog,
  tenantId: string,
  update: (data: Partial<NotificationLog>) => Promise<unknown>,
  fetchImpl?: typeof fetch,
): Promise<'sent' | 'skipped' | 'failed'> {
  let stored: Stored
  try {
    stored = JSON.parse(log.text ?? '') as Stored
  } catch {
    await update({ status: 'skipped', skipReason: 'stale' })
    return 'skipped'
  }
  const reason = await stillWanted(payload, tenantId, stored.check)
  if (reason) {
    await update({ status: 'skipped', skipReason: reason })
    return 'skipped'
  }
  const store = await storeFacts(payload, tenantId)
  const sent = (data: Partial<NotificationLog>) =>
    update({
      status: 'sent',
      sentAt: new Date().toISOString(),
      attempts: (log.attempts ?? 0) + 1,
      ...data,
    })

  if (log.channel === 'whatsapp' && stored.whatsapp) {
    const { template, params, buttonParam } = stored.whatsapp
    const text = fillMarketing(template, params, store.storeName)
    if (log.provider !== 'meta') {
      payload.logger.info(
        `[dev-log whatsapp] To: ${log.to}\n${text}\n[Button] ${store.storeOrigin}/${buttonParam}\n`,
      )
      await sent({ provider: 'dev-log', providerMessageId: `dev-log-${Date.now()}`, preview: text })
      return 'sent'
    }
    const ctx = await loadConnector(payload, tenantId, 'meta-whatsapp')
    const { docs } = await payload.find({
      collection: 'notification-templates',
      where: {
        and: [
          { tenant: { equals: tenantId } },
          { milestone: { equals: template } },
          { channel: { equals: 'whatsapp' } },
        ],
      },
      limit: 1,
      depth: 0,
      pagination: false,
      overrideAccess: true,
    })
    const doc = docs[0]
    if (!ctx || !doc || doc.status !== 'approved') {
      await update({
        status: 'skipped',
        skipReason: ctx ? 'template_not_approved' : 'not_connected',
      })
      return 'skipped'
    }
    const result = await whatsappApi.sendTemplate(
      { ...ctx, fetchImpl },
      {
        to: log.to ?? '',
        name: doc.whatsapp?.name ?? template,
        language: doc.whatsapp?.language ?? 'en',
        bodyParams: params,
        buttonParam,
      },
    )
    if (result.ok) {
      await sent({ providerMessageId: result.messageId, preview: text })
      return 'sent'
    }
    await update({
      status: 'failed',
      failedAt: new Date().toISOString(),
      attempts: (log.attempts ?? 0) + 1,
      error: { code: result.code, message: result.message },
    })
    return 'failed'
  }

  if (!stored.email) {
    await update({ status: 'skipped', skipReason: 'stale' })
    return 'skipped'
  }
  const email = storeMessageEmail({
    ...stored.email,
    storeName: store.storeName,
    themeColor: store.themeColor,
  })
  const result = (await payload.sendEmail({
    to: log.to ?? '',
    from: `"${store.storeName.replace(/"/g, '')}" <${env.EMAIL_FROM_ADDRESS}>`,
    ...(store.supportEmail ? { replyTo: store.supportEmail } : {}),
    subject: email.subject,
    html: email.html,
    text: email.text,
    ...(email.headers ? { headers: email.headers } : {}),
  })) as { id?: string } | undefined
  await sent({
    provider: env.RESEND_API_KEY ? 'resend' : 'dev-log',
    providerMessageId: result?.id ?? null,
    preview: email.subject,
  })
  return 'sent'
}

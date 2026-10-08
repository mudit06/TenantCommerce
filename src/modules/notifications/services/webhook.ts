import type { PayloadRequest } from 'payload'

import { loadConnector, recordWebhookHealth, whatsappApi } from '@/connectors'

import { isNewerStatus, indianMobile, replyIntent } from '../rules'
import { queueStaffAlert, writeLog } from './engine'
import { markAutoReply, preferenceFor, setOfferConsent, setWhatsAppUpdates } from './preferences'
import { storeFacts } from './store'
import { applyTemplateEvent } from './templates'

// Meta's webhook for one store (docs/07 `/api/webhooks/whatsapp/:tenantId`): the GET handshake
// with the verify token, then signed POSTs with message receipts, shopper replies and template
// approvals. Receipts only ever move a message forward; replies are stored once by message id.

type MetaStatus = {
  id?: string
  status?: string
  timestamp?: string
  errors?: { code?: number; title?: string; message?: string; error_data?: { details?: string } }[]
}
type MetaMessage = {
  id?: string
  from?: string
  timestamp?: string
  type?: string
  text?: { body?: string }
  button?: { text?: string; payload?: string }
  interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } }
}
type MetaChange = {
  field?: string
  value?: {
    statuses?: MetaStatus[]
    messages?: MetaMessage[]
    event?: string
    message_template_id?: string | number
    message_template_name?: string
    message_template_language?: string
    reason?: string
  }
}
type MetaWebhook = { object?: string; entry?: { changes?: MetaChange[] }[] }

/** Meta's GET when the webhook is added: answer the challenge if the verify token matches */
export async function verifyHandshake(
  req: PayloadRequest,
  tenantId: string,
  params: URLSearchParams,
): Promise<string | null> {
  const ctx = await loadConnector(req.payload, tenantId, 'meta-whatsapp', {
    requireAllowed: false,
  })
  if (!ctx?.config.webhookToken) return null
  if (params.get('hub.mode') !== 'subscribe') return null
  if (params.get('hub.verify_token') !== ctx.config.webhookToken) return null
  return params.get('hub.challenge')
}

const atOf = (timestamp?: string) =>
  timestamp && /^\d+$/.test(timestamp)
    ? new Date(Number(timestamp) * 1000).toISOString()
    : new Date().toISOString()

export type WhatsAppWebhookOutcome = 'processed' | 'bad-signature' | 'not-configured' | 'ignored'

export async function handleWhatsAppWebhook(
  req: PayloadRequest,
  tenantId: string,
  { rawBody, signature }: { rawBody: string; signature: string | null },
): Promise<WhatsAppWebhookOutcome> {
  const ctx = await loadConnector(req.payload, tenantId, 'meta-whatsapp', {
    requireAllowed: false,
    req,
  })
  if (!ctx) return 'not-configured'
  if (!whatsappApi.verifySignature(ctx.secret.appSecret ?? '', rawBody, signature)) {
    await recordWebhookHealth(req.payload, tenantId, 'meta-whatsapp', {
      ok: false,
      error: 'signature mismatch: the app secret saved here doesn’t match Meta’s',
    })
    return 'bad-signature'
  }
  await recordWebhookHealth(req.payload, tenantId, 'meta-whatsapp', { ok: true })
  let body: MetaWebhook
  try {
    body = JSON.parse(rawBody) as MetaWebhook
  } catch {
    return 'ignored'
  }
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field === 'messages') {
        for (const status of change.value?.statuses ?? []) await applyReceipt(req, tenantId, status)
        for (const message of change.value?.messages ?? []) await applyReply(req, tenantId, message)
      } else if (change.field === 'message_template_status_update' && change.value) {
        await applyTemplateEvent(req, tenantId, {
          name: change.value.message_template_name,
          language: change.value.message_template_language,
          id: change.value.message_template_id,
          event: change.value.event,
          reason: change.value.reason,
        })
      }
    }
  }
  return 'processed'
}

async function applyReceipt(req: PayloadRequest, tenantId: string, status: MetaStatus) {
  if (!status.id || !status.status) return
  const { docs } = await req.payload.find({
    collection: 'notification-logs',
    // Always inside this store: another store's webhook can't touch these rows
    where: {
      and: [{ tenant: { equals: tenantId } }, { providerMessageId: { equals: status.id } }],
    },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  const log = docs[0]
  if (!log || !isNewerStatus(log.status, status.status)) return
  const at = atOf(status.timestamp)
  const error = status.errors?.[0]
  await req.payload.update({
    collection: 'notification-logs',
    id: log.id,
    data: {
      status: status.status as 'sent' | 'delivered' | 'read' | 'failed',
      ...(status.status === 'delivered' ? { deliveredAt: at } : {}),
      ...(status.status === 'read' ? { readAt: at, deliveredAt: log.deliveredAt ?? at } : {}),
      ...(status.status === 'failed'
        ? {
            failedAt: at,
            error: {
              code: error?.code ? String(error.code) : 'failed',
              message: (error?.error_data?.details ?? error?.message ?? error?.title ?? 'Failed')
                .toString()
                .slice(0, 200),
            },
          }
        : {}),
    },
    overrideAccess: true,
    req,
  })
}

const STOP_TEXT = (store: string) =>
  `You won’t get order updates from ${store} on WhatsApp any more. Reply START to turn them back on.`
const STOP_OFFERS_TEXT = (store: string) =>
  `You won’t get offers from ${store} on WhatsApp any more. Updates about your orders still arrive.`
const START_TEXT = (store: string) =>
  `Order updates from ${store} on WhatsApp are back on. Reply STOP to turn them off.`

async function applyReply(req: PayloadRequest, tenantId: string, message: MetaMessage) {
  const phone = indianMobile(message.from)
  if (!message.id || !phone) return
  const text = (
    message.text?.body ??
    message.button?.text ??
    message.interactive?.button_reply?.title ??
    message.interactive?.list_reply?.title ??
    `(${message.type ?? 'message'})`
  ).slice(0, 500)
  // The shopper's latest order in this store, so the reply shows on it
  const { docs: orders } = await req.payload.find({
    collection: 'orders',
    where: { and: [{ tenant: { equals: tenantId } }, { 'contact.phone': { equals: phone } }] },
    sort: '-createdAt',
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  const order = orders[0]
  const inbound = await writeLog(req, {
    tenant: tenantId,
    direction: 'in',
    kind: 'order',
    channel: 'whatsapp',
    provider: 'meta',
    to: phone,
    order: order?.id ?? null,
    dedupeKey: `in:${message.id}`,
    providerMessageId: message.id,
    status: 'received',
    text,
    sentAt: atOf(message.timestamp),
  })
  if (!inbound) return // already handled

  const store = await storeFacts(req.payload, tenantId, req)
  let intent = replyIntent(text)
  // STOP after an offer or cart reminder stops offers, not order updates (docs/18 "Stop")
  if (intent === 'stop') {
    const { docs: last } = await req.payload.find({
      collection: 'notification-logs',
      where: {
        and: [
          { tenant: { equals: tenantId } },
          { to: { equals: phone } },
          { channel: { equals: 'whatsapp' } },
          { direction: { equals: 'out' } },
          { status: { in: ['sent', 'delivered', 'read'] } },
        ],
      },
      sort: '-sentAt',
      limit: 1,
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { kind: true },
      req,
    })
    if (last[0]?.kind === 'offer' || last[0]?.kind === 'cart') intent = 'stop-offers'
  }
  let answer: string | null = null
  if (intent === 'stop-offers') {
    await setOfferConsent(req, tenantId, 'whatsapp', phone, false, 'account')
    answer = STOP_OFFERS_TEXT(store.storeName)
  } else if (intent === 'stop') {
    await setWhatsAppUpdates(req, tenantId, phone, false, 'reply')
    answer = STOP_TEXT(store.storeName)
  } else if (intent === 'start') {
    await setWhatsAppUpdates(req, tenantId, phone, true, 'reply')
    answer = START_TEXT(store.storeName)
  } else {
    // One automatic answer per 24 hours pointing to the store's own contacts (docs/18)
    const pref = await preferenceFor(req.payload, tenantId, 'phone', phone, req)
    const last = pref?.lastAutoReplyAt ? new Date(pref.lastAutoReplyAt).getTime() : 0
    if (Date.now() - last > 86_400_000) {
      const help = [
        store.supportPhone && `call ${store.supportPhone}`,
        store.supportEmail && `email ${store.supportEmail}`,
      ]
        .filter(Boolean)
        .join(' or ')
      answer = `Thanks for your message. This number only sends order updates from ${store.storeName}.${help ? ` For help, please ${help}.` : ''}`
      await markAutoReply(req, tenantId, phone)
    }
    if (order) {
      await queueStaffAlert(req, {
        tenantId,
        alert: 'shopper_reply',
        orderId: String(order.id),
        key: message.id,
        text,
      })
    }
  }
  if (answer) {
    await writeLog(req, {
      tenant: tenantId,
      direction: 'out',
      kind: 'reply',
      milestone: intent ? `reply_${intent.replace('-', '_')}` : 'auto_reply',
      channel: 'whatsapp',
      provider: 'meta',
      to: phone,
      order: order?.id ?? null,
      dedupeKey: `reply:${message.id}`,
      status: 'queued',
      preview: answer,
    })
  }
}

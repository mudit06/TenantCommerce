import type { Payload, PayloadRequest } from 'payload'

import { idOf } from '@/access'
import { adminUrl } from '@/admin/paths'
import { loadConnector, whatsappApi } from '@/connectors'
import { staffAlertEmail } from '@/emails/orderUpdate'
import { env } from '@/lib/env'
import { formatINR } from '@/lib/money'
import type { NotificationLog, Order, Shipment } from '@/payload-types'

import { isMilestoneKey, MILESTONE_FOR_PARCEL, PARCEL_STEP, type MilestoneKey } from '../milestones'
import { renderEmail, renderWhatsApp, sampleFacts, type TemplateText } from '../render'
import type { Variant } from '../starter-templates'
import type { MessageFacts, VariableKey } from '../variables'
import { PREPARED_KINDS, sendPrepared, type PreparedKind } from './prepared'
import { type StoreFacts, storeFacts } from './store'

// The send job (docs/18): re-read the order and parcel, skip what went stale, render, send
// through the connector and record the outcome. Provider errors retry with the job's backoff,
// then the message is marked failed.

export const MAX_ATTEMPTS = 5

export type SendOutcome = 'sent' | 'skipped' | 'failed' | 'retry' | 'not-queued'

type Options = { fetchImpl?: typeof fetch }

const update = (
  payload: Payload,
  id: string,
  data: Partial<NotificationLog>,
  req?: PayloadRequest,
) => payload.update({ collection: 'notification-logs', id, data, overrideAccess: true, req })

/** Has the order or parcel moved on so this message no longer makes sense? */
export function isStale(
  milestone: string,
  order: Pick<Order, 'status'>,
  shipment: Pick<Shipment, 'status'> | null,
): boolean {
  if (order.status === 'cancelled' && !['order_cancelled', 'refund_processed'].includes(milestone))
    return true
  if (!shipment) return false
  const status = Object.entries(MILESTONE_FOR_PARCEL).find(([, m]) => m === milestone)?.[0]
  if (!status) return false
  // The packed message is dropped once the parcel has shipped (docs/18 "Packed delay")
  if (milestone === 'shipment_packed') return shipment.status !== 'packed'
  return (PARCEL_STEP[shipment.status] ?? 0) > (PARCEL_STEP[status] ?? 0) + 1
}

export function factsFor(
  store: StoreFacts,
  order: Order,
  shipment: Shipment | null,
  refund: {
    amountMinor?: number | null
    providerRefundId?: string | null
    reference?: string | null
  } | null,
): MessageFacts {
  return {
    storeName: store.storeName,
    storeOrigin: store.storeOrigin,
    supportPhone: store.supportPhone,
    supportEmail: store.supportEmail,
    order: {
      number: order.orderNumber,
      customerName: order.contact?.name,
      totalMinor: order.totals?.grandTotalMinor ?? 0,
      paymentMethod: order.paymentMethod ?? '',
      items: (order.items ?? []).map((item) => ({ title: item.title, qty: item.qty })),
      trackingCode: order.trackingCode,
      codDueMinor:
        order.paymentMethod === 'cod'
          ? Math.max(0, (order.totals?.grandTotalMinor ?? 0) - (order.totals?.paidMinor ?? 0))
          : 0,
    },
    shipment: shipment
      ? {
          courier: shipment.carrier,
          trackingNumber: shipment.trackingNumber ?? shipment.awb,
          trackingUrl: shipment.trackingUrl,
          expectedDate: shipment.expectedDeliveryDate,
          failureReason: shipment.failureReason,
          codAmountMinor: shipment.codAmountMinor,
        }
      : undefined,
    refund: refund
      ? {
          amountMinor: refund.amountMinor ?? 0,
          reference: refund.providerRefundId || refund.reference,
        }
      : undefined,
  }
}

const templateText = (template: unknown): TemplateText | null => {
  if (!template || typeof template !== 'object') return null
  const t = template as { body?: string; variables?: string[] | null; trackButton?: boolean | null }
  if (!t.body) return null
  return {
    body: t.body,
    variables: (t.variables ?? []) as VariableKey[],
    trackButton: t.trackButton !== false,
  }
}

/** Sends one queued message. Safe to run twice: only a `queued` row is sent. */
export async function sendLog(
  payload: Payload,
  logId: string,
  { fetchImpl }: Options = {},
): Promise<SendOutcome> {
  const log = await payload
    .findByID({ collection: 'notification-logs', id: logId, depth: 0, overrideAccess: true })
    .catch(() => null)
  if (!log || log.status !== 'queued') return 'not-queued'
  const tenantId = idOf(log.tenant)!
  const store = await storeFacts(payload, tenantId)

  let facts: MessageFacts
  let milestone = log.milestone ?? ''
  const variant = (log.variant ?? 'default') as Variant
  if (PREPARED_KINDS.includes(log.kind as PreparedKind)) {
    // Review requests, offers and cart reminders arrive ready to send (./prepared.ts)
    try {
      return await sendPrepared(
        payload,
        log,
        tenantId,
        (data) => update(payload, logId, data),
        fetchImpl,
      )
    } catch (error) {
      return recordResult(
        payload,
        log,
        {
          ok: false,
          code: 'send_error',
          message: error instanceof Error ? error.message.slice(0, 200) : 'Sending failed',
          retryable: true,
        },
        null,
      )
    }
  }
  if (log.kind === 'test') {
    facts = sampleFacts(store, variant)
  } else if (log.kind === 'reply') {
    return sendFreeText(payload, log, tenantId, fetchImpl)
  } else {
    const orderId = idOf(log.order)
    const order = orderId
      ? await payload
          .findByID({ collection: 'orders', id: orderId, depth: 0, overrideAccess: true })
          .catch(() => null)
      : null
    if (!order) {
      await update(payload, logId, { status: 'skipped', skipReason: 'stale' })
      return 'skipped'
    }
    if (log.kind === 'staff') return sendStaffAlert(payload, log, order, store)
    const shipment = log.shipment
      ? await payload
          .findByID({ collection: 'shipments', id: log.shipment, depth: 0, overrideAccess: true })
          .catch(() => null)
      : null
    const refund = log.refund
      ? await payload
          .findByID({ collection: 'refunds', id: log.refund, depth: 0, overrideAccess: true })
          .catch(() => null)
      : null
    if (!log.resendOf && isStale(milestone, order, shipment)) {
      await update(payload, logId, { status: 'skipped', skipReason: 'stale' })
      return 'skipped'
    }
    facts = factsFor(store, order, shipment, refund)
  }
  if (!isMilestoneKey(milestone)) milestone = 'order_confirmed'
  const key = milestone as MilestoneKey

  try {
    if (log.channel === 'email') {
      const email = renderEmail(key, variant, { ...facts, themeColor: store.themeColor })
      const result = (await payload.sendEmail({
        to: log.to ?? '',
        from: `"${store.storeName.replace(/"/g, '')}" <${env.EMAIL_FROM_ADDRESS}>`,
        ...(store.supportEmail ? { replyTo: store.supportEmail } : {}),
        subject: email.subject,
        html: email.html,
        text: email.text,
      })) as { id?: string } | undefined
      await update(payload, logId, {
        status: 'sent',
        provider: env.RESEND_API_KEY ? 'resend' : 'dev-log',
        providerMessageId: result?.id ?? null,
        preview: email.subject,
        sentAt: new Date().toISOString(),
        attempts: (log.attempts ?? 0) + 1,
      })
      return 'sent'
    }
    if (log.channel === 'whatsapp') {
      const doc = log.template
        ? await payload
            .find({
              collection: 'notification-templates',
              where: { and: [{ id: { equals: log.template } }, { tenant: { equals: tenantId } }] },
              limit: 1,
              depth: 0,
              pagination: false,
              overrideAccess: true,
            })
            .then(({ docs }) => docs[0] ?? null)
        : null
      const template = templateText(doc)
      const message = renderWhatsApp(key, variant, facts, template)
      if (log.provider === 'dev-log' || !log.provider) {
        payload.logger.info(
          `[dev-log whatsapp] To: ${log.to}\n${message.text}\n[Track order] ${message.trackUrl}\n`,
        )
        await update(payload, logId, {
          status: 'sent',
          provider: 'dev-log',
          providerMessageId: `dev-log-${Date.now()}`,
          preview: message.text,
          sentAt: new Date().toISOString(),
          attempts: (log.attempts ?? 0) + 1,
        })
        return 'sent'
      }
      const ctx = await loadConnector(payload, tenantId, 'meta-whatsapp')
      if (!ctx || !doc || doc.status !== 'approved') {
        await update(payload, logId, {
          status: 'skipped',
          skipReason: ctx ? 'template_not_approved' : 'not_connected',
        })
        return 'skipped'
      }
      const result = await whatsappApi.sendTemplate(
        { ...ctx, fetchImpl },
        {
          to: log.to ?? '',
          name: doc.whatsapp?.name ?? '',
          language: doc.whatsapp?.language ?? 'en',
          bodyParams: message.bodyParams,
          buttonParam: message.buttonParam,
        },
      )
      return recordResult(payload, log, result, message.text)
    }
    await update(payload, logId, { status: 'skipped', skipReason: 'channel_off' })
    return 'skipped'
  } catch (error) {
    return recordResult(
      payload,
      log,
      {
        ok: false,
        code: 'send_error',
        message: error instanceof Error ? error.message.slice(0, 200) : 'Sending failed',
        retryable: true,
      },
      null,
    )
  }
}

async function recordResult(
  payload: Payload,
  log: NotificationLog,
  result: Awaited<ReturnType<typeof whatsappApi.sendTemplate>>,
  preview: string | null,
): Promise<SendOutcome> {
  const attempts = (log.attempts ?? 0) + 1
  if (result.ok) {
    await update(payload, String(log.id), {
      status: 'sent',
      providerMessageId: result.messageId,
      preview,
      sentAt: new Date().toISOString(),
      attempts,
      error: { code: null, message: null },
    })
    return 'sent'
  }
  if (result.retryable && attempts < MAX_ATTEMPTS) {
    await update(payload, String(log.id), {
      attempts,
      error: { code: result.code, message: result.message },
    })
    return 'retry'
  }
  await update(payload, String(log.id), {
    status: 'failed',
    attempts,
    failedAt: new Date().toISOString(),
    error: { code: result.code, message: result.message },
  })
  return 'failed'
}

/** The automatic answer and STOP or START confirmations: free text inside the 24-hour window */
async function sendFreeText(
  payload: Payload,
  log: NotificationLog,
  tenantId: string,
  fetchImpl?: typeof fetch,
): Promise<SendOutcome> {
  const text = log.preview ?? ''
  if (log.provider !== 'meta') {
    payload.logger.info(`[dev-log whatsapp] To: ${log.to}\n${text}\n`)
    await update(payload, String(log.id), {
      status: 'sent',
      provider: 'dev-log',
      sentAt: new Date().toISOString(),
      attempts: 1,
    })
    return 'sent'
  }
  const ctx = await loadConnector(payload, tenantId, 'meta-whatsapp')
  if (!ctx) {
    await update(payload, String(log.id), { status: 'skipped', skipReason: 'not_connected' })
    return 'skipped'
  }
  const result = await whatsappApi.sendText({ ...ctx, fetchImpl }, { to: log.to ?? '', text })
  return recordResult(payload, log, result, text)
}

const ALERT_SUBJECT: Record<string, (order: Order) => string> = {
  new_order: (order) =>
    `New order ${order.orderNumber}: ${formatINR(order.totals?.grandTotalMinor ?? 0)}${order.paymentMethod === 'cod' ? ' (COD)' : ''}`,
  delivery_failed: (order) => `Delivery failed for order ${order.orderNumber}`,
  shopper_reply: (order) => `A shopper replied on WhatsApp about order ${order.orderNumber}`,
}

async function sendStaffAlert(
  payload: Payload,
  log: NotificationLog,
  order: Order,
  store: StoreFacts,
): Promise<SendOutcome> {
  const subject = (ALERT_SUBJECT[log.milestone ?? ''] ?? ALERT_SUBJECT.new_order!)(order)
  const lines = [
    subject,
    `${order.contact?.name ?? 'Shopper'}, ${(order.items ?? []).length} item${(order.items ?? []).length === 1 ? '' : 's'}.`,
    ...(log.text ? [`They wrote: “${log.text}”`] : []),
  ]
  const email = staffAlertEmail({
    subject: `${store.storeName}: ${subject}`,
    lines,
    link: `${env.ADMIN_URL.replace(/\/$/, '')}${adminUrl.doc('orders', order.id)}`,
  })
  await payload.sendEmail({
    to: log.to ?? '',
    subject: email.subject,
    html: email.html,
    text: email.text,
  })
  await update(payload, String(log.id), {
    status: 'sent',
    provider: env.RESEND_API_KEY ? 'resend' : 'dev-log',
    preview: email.subject,
    sentAt: new Date().toISOString(),
    attempts: 1,
  })
  return 'sent'
}

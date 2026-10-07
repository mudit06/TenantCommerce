import type { PayloadRequest } from 'payload'

import { loadConnector } from '@/connectors'
import { env } from '@/lib/env'
import type { NotificationLog } from '@/payload-types'

import { milestoneOf, type MilestoneKey } from '../milestones'
import { decideChannels, dedupeKey, indianMobile, sendAfterFor, variantFor } from '../rules'
import { preferenceFor, whatsappOptedInFor, whatsappStopped } from './preferences'
import { loadSettings } from './settings'
import { storeFacts } from './store'
import { templateFor } from './templates'

// The notifications engine (docs/18 "How a message is sent"). Event handlers call these inside
// the emitter's transaction: they decide each channel, write one `notification-logs` row per
// channel (dedupe key unique per store) and queue the send job. Nothing here calls a provider.

export const SEND_TASK = 'notifications-send'

type LogData = Omit<NotificationLog, 'id' | 'createdAt' | 'updatedAt'>

/**
 * Writes one message row unless its dedupe key exists, and queues the send. Returns the row, or
 * null for a duplicate (a repeated status, a retried webhook, a double click).
 */
export async function writeLog(
  req: PayloadRequest,
  data: LogData & { tenant: string },
  sendAfter?: Date,
  { queueJob = true }: { queueJob?: boolean } = {},
): Promise<NotificationLog | null> {
  const { totalDocs } = await req.payload.count({
    collection: 'notification-logs',
    where: {
      and: [{ tenant: { equals: data.tenant } }, { dedupeKey: { equals: data.dedupeKey } }],
    },
    overrideAccess: true,
    req,
  })
  if (totalDocs > 0) return null
  const log = await req.payload.create({
    collection: 'notification-logs',
    data: { ...data, sendAfter: sendAfter?.toISOString() ?? data.sendAfter },
    overrideAccess: true,
    req,
  })
  if (log.status === 'queued' && queueJob) {
    await req.payload.jobs.queue({
      task: SEND_TASK,
      input: { logId: String(log.id) },
      queue: 'default',
      ...(sendAfter && sendAfter.getTime() > Date.now() + 1000 ? { waitUntil: sendAfter } : {}),
      req,
    })
  }
  return log
}

/** Messages queued or sent to one address in the last day, for the per-shopper cap */
async function sentToday(req: PayloadRequest, tenantId: string, to: string | null) {
  if (!to) return 0
  const { totalDocs } = await req.payload.count({
    collection: 'notification-logs',
    where: {
      and: [
        { tenant: { equals: tenantId } },
        { to: { equals: to } },
        { direction: { equals: 'out' } },
        { kind: { equals: 'order' } },
        { status: { not_in: ['skipped', 'failed'] } },
        { createdAt: { greater_than: new Date(Date.now() - 86_400_000).toISOString() } },
      ],
    },
    overrideAccess: true,
    req,
  })
  return totalDocs
}

/** WhatsApp through the vendor's own Meta account; local and staging print to the log instead */
export async function whatsappProviderFor(req: PayloadRequest, tenantId: string) {
  const meta = await loadConnector(req.payload, tenantId, 'meta-whatsapp', { req }).catch(
    () => null,
  )
  if (meta) return 'meta' as const
  return env.NODE_ENV === 'production' ? null : ('dev-log' as const)
}

export type MilestoneEvent = {
  tenantId: string
  milestone: MilestoneKey
  orderId: string
  shipmentId?: string
  refundId?: string
  attempt?: number
}

/** One step of the order journey: decide, log and queue each channel the settings allow. */
export async function queueMilestone(req: PayloadRequest, event: MilestoneEvent) {
  const { tenantId, milestone: key, orderId } = event
  const milestone = milestoneOf(key)
  const settings = await loadSettings(req.payload, tenantId, req)
  const modes = settings.milestones[key]
  if (modes.email !== 'on' && modes.whatsapp !== 'on') return []

  const order = await req.payload
    .findByID({ collection: 'orders', id: orderId, depth: 0, overrideAccess: true, req })
    .catch(() => null)
  if (!order) return []
  const email = order.contact?.email?.trim().toLowerCase() || null
  const phone = indianMobile(order.contact?.phone)
  const variant = variantFor(milestone, order.paymentMethod ?? '')

  const pref = phone ? await preferenceFor(req.payload, tenantId, 'phone', phone, req) : null
  const provider = modes.whatsapp === 'on' ? await whatsappProviderFor(req, tenantId) : null
  const template =
    modes.whatsapp === 'on' ? await templateFor(req.payload, tenantId, key, variant, req) : null
  const plans = decideChannels({
    modes: { email: modes.email, whatsapp: modes.whatsapp },
    email,
    phone,
    whatsappOptIn: whatsappOptedInFor(order, pref),
    whatsappOptedOut: whatsappStopped(pref),
    whatsappProvider: provider,
    templateApproved: template?.status === 'approved',
    sentToday: {
      email: await sentToday(req, tenantId, email),
      phone: await sentToday(req, tenantId, phone),
    },
    perRecipientPerDay: settings.limits.perRecipientPerDay,
  })
  if (!plans.length) return []

  const { timeZone } = await storeFacts(req.payload, tenantId, req)
  const sendAfter = sendAfterFor(new Date(), milestone, {
    packedDelayMinutes: settings.packedDelayMinutes,
    quietHours: settings.quietHours,
    timeZone,
  })
  const subjectId = event.shipmentId ?? event.refundId ?? orderId
  const logs: NotificationLog[] = []
  for (const plan of plans) {
    const log = await writeLog(
      req,
      {
        tenant: tenantId,
        direction: 'out',
        kind: 'order',
        milestone: key,
        variant,
        channel: plan.channel,
        provider: plan.send ? plan.provider : null,
        to: plan.channel === 'email' ? email : phone,
        order: orderId,
        shipment: event.shipmentId ?? null,
        refund: event.refundId ?? null,
        template: plan.channel === 'whatsapp' && template ? String(template.id) : null,
        dedupeKey: dedupeKey(key, subjectId, event.attempt ?? 0, plan.channel),
        status: plan.send ? 'queued' : 'skipped',
        skipReason: plan.send ? null : plan.reason,
      },
      plan.send ? sendAfter : undefined,
    )
    if (log) logs.push(log)
  }
  return logs
}

export type StaffAlert = 'new_order' | 'delivery_failed' | 'shopper_reply'

/** Emails to the store's alert addresses: a new order, a failed delivery, a WhatsApp reply */
export async function queueStaffAlert(
  req: PayloadRequest,
  input: {
    tenantId: string
    alert: StaffAlert
    orderId?: string | null
    key: string
    text?: string
  },
) {
  const settings = await loadSettings(req.payload, input.tenantId, req)
  for (const to of settings.staffAlertEmails) {
    await writeLog(req, {
      tenant: input.tenantId,
      direction: 'out',
      kind: 'staff',
      milestone: input.alert,
      channel: 'email',
      provider: 'resend',
      to,
      order: input.orderId ?? null,
      dedupeKey: `staff:${input.alert}:${input.key}:${to}`,
      status: 'queued',
      text: input.text ?? null,
    })
  }
}

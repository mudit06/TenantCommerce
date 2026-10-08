import type { Payload, PayloadRequest } from 'payload'
import { z } from 'zod'

import { idOf } from '@/access'
import { AppError } from '@/lib/errors'
import type { NotificationLog, Order } from '@/payload-types'

import { CHANNEL_LABELS, MILESTONE_KEYS, milestoneOf, SKIP_REASONS } from '../milestones'
import { indianMobile } from '../rules'
import { assertNotificationAccess } from './access'
import { whatsappProviderFor, writeLog } from './engine'
import { preferenceFor, whatsappOptedInFor, whatsappStopped } from './preferences'
import { sendLog, type SendOutcome } from './send'
import { loadSettings } from './settings'
import { templateFor } from './templates'

// The order's Messages panel (docs/screens Order detail rule 6), "Resend" and "Send test to my
// phone" on the Order updates screen.

export const RESEND_COOLDOWN_MS = 10 * 60_000

export type MessageRow = {
  id: string
  direction: 'out' | 'in'
  channel: string
  channelLabel: string
  step: string
  at: string
  status: string
  statusText: string
  tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  text: string | null
  canResend: boolean
}

const STEP_LABEL: Record<string, string> = {
  auto_reply: 'Automatic answer',
  reply_stop: 'Stopped updates',
  reply_start: 'Started updates',
  review_request: 'Review request',
  review_reply: 'Reply to their review',
  offer_message: 'Offer message',
  cart_reminder_1: 'Cart reminder',
  cart_reminder_2: 'Second cart reminder',
}

const stepLabel = (milestone: string | null | undefined) => {
  if (!milestone) return 'Message'
  if (STEP_LABEL[milestone]) return STEP_LABEL[milestone]
  try {
    return milestoneOf(milestone).label
  } catch {
    return milestone
  }
}

const skipText = (reason: string | null | undefined) =>
  SKIP_REASONS.find((r) => r.value === reason)?.label ?? 'Not sent'

function statusOf(log: NotificationLog): Pick<MessageRow, 'statusText' | 'tone'> {
  const time = (value?: string | null) =>
    value
      ? new Date(value).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'Asia/Kolkata',
        })
      : ''
  switch (log.status) {
    case 'read':
      return { statusText: `Read ${time(log.readAt)}`.trim(), tone: 'success' }
    case 'delivered':
      return { statusText: 'Delivered', tone: 'success' }
    case 'sent':
      return { statusText: log.provider === 'dev-log' ? 'Sent (dev log)' : 'Sent', tone: 'info' }
    case 'queued':
      return {
        statusText:
          log.sendAfter && new Date(log.sendAfter).getTime() > Date.now() + 60_000
            ? `Goes out at ${time(log.sendAfter)}`
            : 'Sending',
        tone: 'neutral',
      }
    case 'failed':
      return { statusText: `Failed: ${log.error?.message ?? 'unknown reason'}`, tone: 'danger' }
    case 'received':
      return { statusText: 'Shopper replied', tone: 'warning' }
    default:
      return { statusText: skipText(log.skipReason), tone: 'neutral' }
  }
}

export async function orderMessages(
  payload: Payload,
  tenantId: string,
  orderId: string,
): Promise<MessageRow[]> {
  const { docs } = await payload.find({
    collection: 'notification-logs',
    where: {
      and: [
        { tenant: { equals: tenantId } },
        { order: { equals: orderId } },
        { kind: { in: ['order', 'reply'] } },
      ],
    },
    sort: 'createdAt',
    limit: 100,
    depth: 0,
    overrideAccess: true,
  })
  return docs.map((log) => ({
    id: String(log.id),
    direction: (log.direction ?? 'out') as 'out' | 'in',
    channel: log.channel,
    channelLabel: CHANNEL_LABELS[log.channel as keyof typeof CHANNEL_LABELS] ?? log.channel,
    step: log.direction === 'in' ? 'Reply from the shopper' : stepLabel(log.milestone),
    at: log.sentAt ?? log.createdAt,
    status: log.status,
    ...statusOf(log),
    text: log.direction === 'in' ? (log.text ?? null) : null,
    canResend:
      log.direction !== 'in' &&
      log.kind === 'order' &&
      ['sent', 'delivered', 'read', 'failed'].includes(log.status),
  }))
}

/** "Resend": the same message again, now, at most once every 10 minutes per message */
export async function resendMessage(
  req: PayloadRequest,
  orderId: string,
  logId: string,
): Promise<NotificationLog> {
  const original = await req.payload
    .findByID({ collection: 'notification-logs', id: logId, depth: 0, overrideAccess: true, req })
    .catch(() => null)
  if (!original || idOf(original.order) !== orderId)
    throw new AppError('NOT_FOUND', 'Message not found on this order', 404)
  const tenantId = idOf(original.tenant)!
  assertNotificationAccess(req, tenantId, 'resend')
  if (original.direction === 'in' || original.kind !== 'order')
    throw new AppError('BUSINESS_RULE', 'Only order updates can be sent again', 422)
  if (!['sent', 'delivered', 'read', 'failed'].includes(original.status))
    throw new AppError('BUSINESS_RULE', 'This message wasn’t sent, so it can’t be sent again', 422)
  const { docs: recent } = await req.payload.find({
    collection: 'notification-logs',
    where: {
      and: [
        { tenant: { equals: tenantId } },
        { resendOf: { equals: logId } },
        { createdAt: { greater_than: new Date(Date.now() - RESEND_COOLDOWN_MS).toISOString() } },
      ],
    },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  if (recent.length || Date.now() - new Date(original.createdAt).getTime() < RESEND_COOLDOWN_MS)
    throw new AppError('BUSINESS_RULE', 'Wait 10 minutes before sending this message again', 429)
  const log = await writeLog(req, {
    tenant: tenantId,
    direction: 'out',
    kind: 'order',
    milestone: original.milestone,
    variant: original.variant,
    channel: original.channel,
    provider: original.provider,
    to: original.to,
    order: orderId,
    shipment: original.shipment,
    refund: original.refund,
    template: original.template,
    dedupeKey: `${original.dedupeKey}:resend:${Date.now()}`,
    status: 'queued',
    resendOf: logId,
    sentBy: req.user?.collection === 'users' ? String(req.user.id) : null,
  })
  return log!
}

export const testInputSchema = z.object({
  store: z.string().min(1),
  milestone: z.enum(MILESTONE_KEYS),
  variant: z.enum(['default', 'prepaid', 'cod']).default('default'),
  channel: z.enum(['email', 'whatsapp']),
  to: z.string().trim().min(3).max(120),
})
export type TestInput = z.infer<typeof testInputSchema>

/**
 * "Send test to my phone": the real approved template (or the email) with a sample order, to a
 * staff phone or inbox. Sent at once, outside the job queue, so the screen shows the outcome.
 */
export async function sendTest(
  req: PayloadRequest,
  input: TestInput,
  { fetchImpl }: { fetchImpl?: typeof fetch } = {},
): Promise<{ outcome: SendOutcome; message: string }> {
  assertNotificationAccess(req, input.store, 'settings')
  const milestone = milestoneOf(input.milestone)
  const variant = milestone.variants.includes(input.variant as never)
    ? input.variant
    : milestone.variants[0]!
  let to = input.to.toLowerCase()
  let provider: 'resend' | 'meta' | 'dev-log' = 'resend'
  let templateId: string | null = null
  if (input.channel === 'whatsapp') {
    const phone = indianMobile(input.to)
    if (!phone)
      throw new AppError('VALIDATION_FAILED', 'Enter a 10-digit Indian mobile number', 400, {
        to: 'Enter a 10-digit Indian mobile number',
      })
    to = phone
    const which = await whatsappProviderFor(req, input.store)
    if (!which) throw new AppError('BUSINESS_RULE', 'Connect WhatsApp first', 409)
    provider = which
    const template = await templateFor(req.payload, input.store, input.milestone, variant, req)
    if (which === 'meta' && template?.status !== 'approved')
      throw new AppError(
        'BUSINESS_RULE',
        'Meta hasn’t approved this step’s template yet, so it can’t be sent',
        409,
      )
    templateId = template ? String(template.id) : null
  } else if (!z.email().safeParse(to).success) {
    throw new AppError('VALIDATION_FAILED', 'Enter a valid email', 400, {
      to: 'Enter a valid email',
    })
  }
  const log = await writeLog(
    req,
    {
      tenant: input.store,
      direction: 'out',
      kind: 'test',
      milestone: input.milestone,
      variant,
      channel: input.channel,
      provider,
      to,
      template: templateId,
      dedupeKey: `test:${input.milestone}:${input.channel}:${Date.now()}`,
      status: 'queued',
      sentBy: req.user?.collection === 'users' ? String(req.user.id) : null,
    },
    undefined,
    { queueJob: false },
  )
  const outcome = await sendLog(req.payload, String(log!.id), { fetchImpl })
  return {
    outcome,
    message:
      outcome === 'sent'
        ? `Test sent to ${input.channel === 'email' ? to : 'that phone'}.`
        : 'The test didn’t go out. See the message on the WhatsApp screen.',
  }
}

/** The line under the Messages panel: what the shopper agreed to, and what goes out next */
export async function orderMessageFootnote(
  payload: Payload,
  tenantId: string,
  order: Pick<
    Order,
    'contact' | 'whatsappOptIn' | 'placedAt' | 'createdAt' | 'status' | 'fulfillmentStatus'
  >,
): Promise<string> {
  const phone = indianMobile(order.contact?.phone)
  const pref = phone ? await preferenceFor(payload, tenantId, 'phone', phone) : null
  const settings = await loadSettings(payload, tenantId)
  const consent = !phone
    ? 'No mobile number on this order, so updates go by email.'
    : whatsappStopped(pref)
      ? 'The shopper stopped WhatsApp updates; they still get emails.'
      : whatsappOptedInFor(order, pref)
        ? 'Opted in to WhatsApp at checkout.'
        : 'Didn’t tick WhatsApp at checkout, so updates go by email.'
  const notPacked =
    order.status === 'confirmed' && (order.fulfillmentStatus ?? 'unfulfilled') === 'unfulfilled'
  const next =
    notPacked && settings.milestones.shipment_packed.whatsapp === 'on'
      ? ` Next: “Packed” goes out ${settings.packedDelayMinutes} minutes after you mark it packed, unless it ships first.`
      : ''
  return consent + next
}

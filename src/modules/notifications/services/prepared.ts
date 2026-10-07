import type { Payload, PayloadRequest } from 'payload'

import { storeMessageEmail, type StoreMessageInput } from '@/emails/storeMessage'
import { env } from '@/lib/env'
import type { NotificationLog } from '@/payload-types'

import { writeLog } from './engine'
import { storeFacts } from './store'

// Messages other modules prepare (docs/18): review requests (reviews), offer messages and cart
// reminders (campaigns). The caller checks consent and limits; this keeps one log row per
// message, deduped, and the send job delivers it like any order update.

export type PreparedEmail = Omit<StoreMessageInput, 'storeName' | 'themeColor'>

export const PREPARED_KINDS = ['review', 'offer', 'cart'] as const
export type PreparedKind = (typeof PREPARED_KINDS)[number]

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
      text: JSON.stringify(input.email),
      preview: input.email.subject,
    },
    input.sendAfter,
  )
}

/** Sends a prepared email (called by sendLog for review, offer and cart rows). */
export async function sendPrepared(
  payload: Payload,
  log: NotificationLog,
  tenantId: string,
  update: (data: Partial<NotificationLog>) => Promise<unknown>,
): Promise<'sent' | 'skipped'> {
  let content: PreparedEmail
  try {
    content = JSON.parse(log.text ?? '') as PreparedEmail
  } catch {
    await update({ status: 'skipped', skipReason: 'stale' })
    return 'skipped'
  }
  const store = await storeFacts(payload, tenantId)
  const email = storeMessageEmail({
    ...content,
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
  await update({
    status: 'sent',
    provider: env.RESEND_API_KEY ? 'resend' : 'dev-log',
    providerMessageId: result?.id ?? null,
    preview: email.subject,
    sentAt: new Date().toISOString(),
    attempts: (log.attempts ?? 0) + 1,
  })
  return 'sent'
}

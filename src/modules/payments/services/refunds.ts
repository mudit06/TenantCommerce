import type { PayloadRequest } from 'payload'
import { z } from 'zod'

import { idOf } from '@/access'
import { loadConnector, razorpayApi } from '@/connectors'
import { withTransaction } from '@/lib/db/transaction'
import { emit } from '@/lib/events'
import { AppError } from '@/lib/errors'
import { formatINR } from '@/lib/money'
import { recordAudit } from '@/modules/audit'
import { addOrderEvent, loadOrder } from '@/modules/orders'
import { issueCreditNote } from '@/modules/tax-invoicing'
import type { Refund } from '@/payload-types'

// Refunds (docs/11 "Refunds"): through Razorpay for online payments, recorded by staff with the
// bank or UPI reference for cash on delivery. Never more than what was paid and not yet given
// back. Each one gets a credit note when the order has an invoice.

export const refundSchema = z.object({
  amountMinor: z.number().int().min(1, 'Enter an amount'),
  reason: z.string().trim().min(3, 'Say why, for the shopper and the credit note').max(200),
  /** Manual: money sent outside Razorpay (bank transfer, UPI), with its reference */
  manual: z.boolean().default(false),
  reference: z.string().trim().max(80).optional(),
})
export type RefundInput = z.infer<typeof refundSchema>

/**
 * Gives money back on an order. The provider is called first, outside any transaction, so a
 * failure on our side can never lose a refund that already left; our records are then written
 * together in one transaction.
 */
export async function refundOrder(
  req: PayloadRequest,
  orderId: string,
  input: RefundInput,
  fetchImpl?: typeof fetch,
): Promise<Refund> {
  const order = await loadOrder(req, orderId)
  const tenantId = idOf(order.tenant)!
  const paid = order.totals?.paidMinor ?? 0
  const refunded = order.totals?.refundedMinor ?? 0
  const left = paid - refunded
  if (left <= 0)
    throw new AppError('BUSINESS_RULE', 'Nothing paid on this order is left to refund.', 409)
  if (input.amountMinor > left) {
    throw new AppError(
      'VALIDATION_FAILED',
      `At most ${formatINR(left, { decimals: 'always' })} can be refunded.`,
      400,
      {
        amountMinor: `At most ${formatINR(left, { decimals: 'always' })}`,
      },
    )
  }
  const online = order.paymentMethod === 'razorpay' && !input.manual
  if (!online && !input.reference) {
    throw new AppError('VALIDATION_FAILED', 'Enter the bank transfer or UPI reference.', 400, {
      reference: 'Enter the reference',
    })
  }

  let providerRefundId: string | undefined
  let status: Refund['status'] = 'processed'
  let transactionId: string | undefined
  if (online) {
    const { docs } = await req.payload.find({
      collection: 'transactions',
      where: {
        and: [
          { order: { equals: orderId } },
          { status: { in: ['captured', 'partially_refunded'] } },
        ],
      },
      limit: 1,
      depth: 0,
      pagination: false,
      overrideAccess: true,
    })
    const transaction = docs[0]
    const ctx = await loadConnector(req.payload, tenantId, 'razorpay', { requireAllowed: false })
    if (!transaction?.providerPaymentId || !ctx) {
      throw new AppError(
        'BUSINESS_RULE',
        'This payment can’t be refunded through Razorpay. Record a manual refund.',
        422,
      )
    }
    transactionId = String(transaction.id)
    const refund = await razorpayApi.refundPayment(
      { ...ctx, fetchImpl },
      transaction.providerPaymentId,
      {
        amountMinor: input.amountMinor,
        notes: { orderNumber: order.orderNumber, reason: input.reason.slice(0, 200) },
      },
    )
    providerRefundId = refund.id
    status =
      refund.status === 'processed'
        ? 'processed'
        : refund.status === 'failed'
          ? 'failed'
          : 'pending'
  }

  return withTransaction(req, async () => {
    const creditNote = await issueCreditNote(req, orderId, {
      amountMinor: input.amountMinor,
      reason: input.reason,
    })
    const record = await req.payload.create({
      collection: 'refunds',
      data: {
        tenant: tenantId,
        order: orderId,
        transaction: transactionId,
        amountMinor: input.amountMinor,
        reason: input.reason,
        method: online ? 'razorpay' : 'manual',
        providerRefundId,
        reference: input.reference || undefined,
        status,
        creditNote: creditNote?.id,
        by: req.user?.collection === 'users' ? req.user.id : undefined,
        processedAt: status === 'processed' ? new Date().toISOString() : undefined,
      },
      overrideAccess: true,
      req,
    })
    const nowRefunded = refunded + input.amountMinor
    await req.payload.update({
      collection: 'orders',
      id: orderId,
      data: {
        totals: { ...order.totals, refundedMinor: nowRefunded },
        paymentStatus: nowRefunded >= paid ? 'refunded' : 'partially_refunded',
      },
      overrideAccess: true,
      req,
    })
    if (transactionId) {
      await req.payload.update({
        collection: 'transactions',
        id: transactionId,
        data: {
          refundedMinor: nowRefunded,
          status: nowRefunded >= paid ? 'refunded' : 'partially_refunded',
        },
        overrideAccess: true,
        req,
      })
    }
    await addOrderEvent(req, {
      tenantId,
      orderId,
      type: 'refund',
      text: `${formatINR(input.amountMinor, { decimals: 'always' })} refunded ${online ? 'through Razorpay' : `by hand (${input.reference})`}: ${input.reason}${
        creditNote ? ` · credit note ${creditNote.number}` : ''
      }${status === 'pending' ? ' · Razorpay is processing it' : ''}`,
    })
    await recordAudit(req, {
      action: 'refund',
      tenant: tenantId,
      summary: `Refunded ${formatINR(input.amountMinor)} on ${order.orderNumber}`,
      collectionSlug: 'orders',
      docId: orderId,
      diff: { amountMinor: input.amountMinor, method: online ? 'razorpay' : 'manual' },
      reason: input.reason,
    })
    if (status === 'processed') {
      await emit(
        'refund.processed',
        { tenantId, orderId, refundId: String(record.id), amountMinor: input.amountMinor },
        { req },
      )
    }
    return record
  })
}

/** Razorpay's refund.processed / refund.failed webhook settles a pending refund. */
export async function settleRefundFromWebhook(
  req: PayloadRequest,
  tenantId: string,
  providerRefundId: string,
  outcome: 'processed' | 'failed',
): Promise<boolean> {
  const { docs } = await req.payload.find({
    collection: 'refunds',
    where: {
      and: [{ tenant: { equals: tenantId } }, { providerRefundId: { equals: providerRefundId } }],
    },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  const refund = docs[0]
  if (!refund || refund.status === outcome) return false
  await req.payload.update({
    collection: 'refunds',
    id: refund.id,
    data: { status: outcome, processedAt: new Date().toISOString() },
    overrideAccess: true,
    req,
  })
  const orderId = idOf(refund.order)!
  await addOrderEvent(req, {
    tenantId,
    orderId,
    type: 'refund',
    text:
      outcome === 'processed'
        ? `Razorpay completed the refund of ${formatINR(refund.amountMinor, { decimals: 'always' })}`
        : `Razorpay could not complete the refund of ${formatINR(refund.amountMinor, { decimals: 'always' })}. Refund it by hand.`,
    byLabel: 'Razorpay',
  })
  if (outcome === 'processed') {
    await emit(
      'refund.processed',
      { tenantId, orderId, refundId: String(refund.id), amountMinor: refund.amountMinor },
      { req },
    )
  }
  return true
}

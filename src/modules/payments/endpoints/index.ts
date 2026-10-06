import type { Endpoint } from 'payload'

import { withTransaction } from '@/lib/db/transaction'
import { AppError } from '@/lib/errors'
import { apiHandler, assertSameOrigin, ok, readBody, routeParam } from '@/lib/http/endpoint'
import { orderFor } from '@/modules/orders'

import { handleRazorpayWebhook } from '../services/online'
import { refundOrder, refundSchema } from '../services/refunds'

/**
 * `POST /api/webhooks/razorpay/:tenantId` (docs/07 "Webhooks in"). The store comes from the path,
 * then the signature is checked with that store's webhook secret. A wrong signature answers 400 so
 * Razorpay's dashboard shows the failure; everything else answers 200 at once.
 */
export const paymentEndpoints: Endpoint[] = [
  {
    path: '/webhooks/razorpay/:tenantId',
    method: 'post',
    handler: async (req) => {
      const tenantId = String(req.routeParams?.tenantId ?? '')
      const rawBody = req.text ? await req.text() : ''
      try {
        const outcome = await withTransaction(req, () =>
          handleRazorpayWebhook(req, tenantId, {
            rawBody,
            signature: req.headers.get('x-razorpay-signature'),
            eventId: req.headers.get('x-razorpay-event-id'),
          }),
        )
        return Response.json(
          { ok: outcome !== 'bad-signature', outcome },
          {
            status: outcome === 'bad-signature' ? 400 : 200,
          },
        )
      } catch (error) {
        req.payload.logger.error({ err: error, msg: 'Razorpay webhook failed', tenantId })
        // 500 makes Razorpay retry later
        return Response.json({ ok: false }, { status: 500 })
      }
    },
  },
]

/** Refund from the order screen (docs/07 `POST /orders/:id/refund`). */
paymentEndpoints.push({
  path: '/admin/v1/orders/:id/refund',
  method: 'post',
  handler: apiHandler(async (req) => {
    if (!req.user) throw new AppError('UNAUTHENTICATED', 'Sign in first', 401)
    assertSameOrigin(req)
    const id = routeParam(req, 'id')
    await orderFor(req, id, true)
    const input = await readBody(req, refundSchema)
    // No outer transaction: Razorpay is called first, then our records in one transaction
    const refund = await refundOrder(req, id, input)
    return ok({ refundId: refund.id, status: refund.status }, 201)
  }),
})

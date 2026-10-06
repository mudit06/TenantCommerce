import type { Endpoint } from 'payload'

import { withTransaction } from '@/lib/db/transaction'

import { handleRazorpayWebhook } from '../services/online'

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

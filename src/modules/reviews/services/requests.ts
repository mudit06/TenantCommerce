import type { Payload, PayloadRequest } from 'payload'

import { queuePreparedEmail, storeFacts } from '@/modules/notifications'
import { featureConfig } from '@/modules/tenancy'

import { reviewToken } from './token'

// Review requests (docs/screens Reviews rule 4): once per order, a set number of days after
// delivery, by email. Nothing is offered in return (docs/14). WhatsApp review requests need an
// approved marketing template and offer consent; they come with WhatsApp offers.

type Config = { requestAfterDays: number; requestChannels: string[] }

/** Queues the request for orders delivered `requestAfterDays` ago (up to 3 days late). */
export async function queueReviewRequests(payload: Payload, req: PayloadRequest, now = new Date()) {
  // Delivered orders from the last 63 days, then each store's own day count
  const { docs } = await payload.find({
    collection: 'orders',
    where: {
      and: [
        { fulfillmentStatus: { equals: 'delivered' } },
        { completedAt: { greater_than: new Date(now.getTime() - 63 * 86_400_000).toISOString() } },
      ],
    },
    depth: 0,
    limit: 2000,
    pagination: false,
    overrideAccess: true,
    select: { tenant: true, completedAt: true, contact: true, orderNumber: true },
  })
  const configs = new Map<string, Config | null>()
  let queued = 0
  for (const order of docs) {
    const tenantId =
      typeof order.tenant === 'object' ? String(order.tenant?.id) : String(order.tenant)
    if (!configs.has(tenantId)) {
      configs.set(tenantId, await featureConfig<Config>(payload, tenantId, 'reviews'))
    }
    const config = configs.get(tenantId)
    if (
      !config ||
      !config.requestChannels.includes('email') ||
      !order.contact?.email ||
      !order.completedAt
    )
      continue
    const due = new Date(order.completedAt).getTime() + config.requestAfterDays * 86_400_000
    if (due > now.getTime() || now.getTime() - due > 3 * 86_400_000) continue
    const store = await storeFacts(payload, tenantId)
    const firstName = order.contact.name?.split(' ')[0]
    const log = await queuePreparedEmail(req, {
      tenantId,
      kind: 'review',
      milestone: 'review_request',
      to: order.contact.email,
      orderId: String(order.id),
      dedupeKey: `review_request:${order.id}`,
      email: {
        subject: `How is your order ${order.orderNumber}?`,
        heading: `${firstName ? `${firstName}, how` : 'How'} is your order?`,
        paragraphs: [
          `Your order ${order.orderNumber} from ${store.storeName} was delivered. Tell other buyers what you think: a rating takes a few seconds.`,
          'We publish honest reviews, good or bad.',
        ],
        button: {
          label: 'Write a review',
          url: `${store.storeOrigin}/review/${reviewToken(String(order.id))}`,
        },
      },
    })
    if (log) queued += 1
  }
  return queued
}

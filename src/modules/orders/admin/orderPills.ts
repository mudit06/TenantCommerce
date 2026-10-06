import type { Tone } from '@/admin/ui'
import { label } from '@/modules/orders/constants'

import { FULFILLMENT_STATUSES, ORDER_STATUSES } from '../constants'

type OrderLike = {
  status: string
  paymentStatus: string
  paymentMethod: string
  fulfillmentStatus: string
}

/** Payment as staff read it at a glance (docs/screens Orders rule 1). */
export function paymentPill(order: OrderLike): { tone: Tone; text: string } {
  if (order.paymentStatus === 'refunded') return { tone: 'neutral', text: 'Refunded' }
  if (order.paymentStatus === 'partially_refunded')
    return { tone: 'warning', text: 'Partly refunded' }
  if (order.paymentStatus === 'paid') return { tone: 'success', text: 'Paid' }
  if (order.paymentStatus === 'failed')
    return { tone: 'danger', text: order.status === 'cancelled' ? 'Not paid' : 'Failed' }
  if (order.paymentMethod === 'cod') return { tone: 'warning', text: 'COD, to collect' }
  return { tone: 'warning', text: 'Awaiting payment' }
}

export function deliveryPill(order: OrderLike): { tone: Tone; text: string } {
  const status = order.fulfillmentStatus
  const tone: Tone =
    status === 'delivered' || status === 'out_for_delivery'
      ? 'success'
      : status === 'cancelled' || status === 'delivery_failed' || status === 'lost'
        ? 'danger'
        : status === 'packed' || status === 'rto' || status === 'returned'
          ? 'warning'
          : status === 'shipped' || status === 'partially_shipped'
            ? 'info'
            : 'neutral'
  return { tone, text: label(FULFILLMENT_STATUSES, status) }
}

export function orderPill(order: OrderLike): { tone: Tone; text: string } {
  const tone: Tone =
    order.status === 'cancelled'
      ? 'danger'
      : order.status === 'pending'
        ? 'warning'
        : order.status === 'completed'
          ? 'success'
          : 'info'
  return { tone, text: label(ORDER_STATUSES, order.status) }
}

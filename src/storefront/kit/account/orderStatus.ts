import type { Order } from '@/payload-types'

/** The order's state in the shopper's words (docs/screens My account, Order tracking). */
export function shopperOrderStatus(order: Pick<Order, 'status' | 'fulfillmentStatus'>): {
  label: string
  tone: 'ok' | 'warn' | 'muted'
} {
  if (order.status === 'cancelled') return { label: 'Cancelled', tone: 'muted' }
  switch (order.fulfillmentStatus) {
    case 'delivered':
      return { label: 'Delivered', tone: 'ok' }
    case 'out_for_delivery':
      return { label: 'Out for delivery', tone: 'ok' }
    case 'delivery_failed':
      return { label: 'Delivery attempt failed', tone: 'warn' }
    case 'shipped':
    case 'partially_shipped':
      return { label: 'Shipped', tone: 'ok' }
    case 'packed':
      return { label: 'Packed', tone: 'ok' }
    case 'rto':
      return { label: 'Returning to the store', tone: 'warn' }
    case 'returned':
      return { label: 'Returned', tone: 'muted' }
    case 'lost':
      return { label: 'Lost in transit', tone: 'warn' }
    default:
      return { label: 'Confirmed', tone: 'ok' }
  }
}

export const pillClass = (tone: 'ok' | 'warn' | 'muted') =>
  `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
    tone === 'ok'
      ? 'bg-emerald-50 text-emerald-800'
      : tone === 'warn'
        ? 'bg-amber-50 text-amber-800'
        : 'bg-surface-alt text-ink-soft'
  }`

export const dayMonth = (iso: string | null | undefined, weekday = false) =>
  iso
    ? new Date(iso).toLocaleDateString('en-IN', {
        ...(weekday ? { weekday: 'short' as const } : {}),
        day: 'numeric',
        month: 'short',
        timeZone: 'Asia/Kolkata',
      })
    : ''

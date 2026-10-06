import type { PayloadRequest } from 'payload'

import type { OrderEventType } from '../constants'

/** Appends one line to an order's timeline (docs/06 `order-events`), with who did it. */
export async function addOrderEvent(
  req: PayloadRequest,
  input: {
    tenantId: string
    orderId: string
    type: OrderEventType
    text: string
    from?: string | null
    to?: string | null
    /** When not the signed-in staff member: system, shopper, Razorpay, Shiprocket */
    byLabel?: string
    data?: Record<string, unknown>
    at?: Date
  },
): Promise<void> {
  const staff = req.user?.collection === 'users' ? req.user : null
  await req.payload.create({
    collection: 'order-events',
    data: {
      tenant: input.tenantId,
      order: input.orderId,
      type: input.type,
      text: input.text,
      from: input.from ?? undefined,
      to: input.to ?? undefined,
      byUser: staff && !input.byLabel ? staff.id : undefined,
      byLabel: input.byLabel ?? (staff ? undefined : 'system'),
      data: input.data,
      at: (input.at ?? new Date()).toISOString(),
    },
    overrideAccess: true,
    req,
  })
}

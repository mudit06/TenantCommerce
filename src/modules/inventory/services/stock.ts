import type { PayloadRequest } from 'payload'

import { conditionalUpdate } from '@/lib/db/atomic'
import { AppError } from '@/lib/errors'

// Stock for orders (docs/11 "Stock"). Checkout holds each variant's quantity with one
// conditional update (available = stockQty − reservedQty must cover it), inside the order's
// transaction so a later line that can't be held undoes the earlier ones. Confirming the order
// turns the hold into a sale; cancelling gives it back. Products sold without variants (made to
// order) don't track stock. Every change writes a stock movement.

export type StockLine = { variantId: string; qty: number; allowBackorder?: boolean; title?: string }

async function movement(
  req: PayloadRequest,
  tenantId: string,
  orderId: string,
  line: StockLine,
  reason: 'reserve' | 'release' | 'sale' | 'cancel',
  deltas: { stockDelta: number; reservedDelta: number },
) {
  await req.payload.create({
    collection: 'stock-movements',
    data: {
      tenant: tenantId,
      variant: line.variantId,
      order: orderId,
      reason,
      ...deltas,
      by: req.user?.collection === 'users' ? req.user.id : undefined,
    },
    overrideAccess: true,
    req,
  })
}

/** Holds stock for a new order. Throws a readable error naming the first item that ran out. */
export async function reserveStock(
  req: PayloadRequest,
  tenantId: string,
  orderId: string,
  lines: readonly StockLine[],
): Promise<void> {
  for (const line of lines) {
    const enough = line.allowBackorder
      ? {}
      : {
          $expr: {
            $gte: [{ $subtract: ['$stockQty', { $ifNull: ['$reservedQty', 0] }] }, line.qty],
          },
        }
    const held = await conditionalUpdate(req, {
      collection: 'variants',
      id: line.variantId,
      tenantId,
      condition: enough,
      update: { $inc: { reservedQty: line.qty } },
    })
    if (!held) {
      throw new AppError(
        'CONFLICT',
        `${line.title ?? 'An item'} just sold out in this quantity. Lower the quantity or remove it.`,
        409,
        { [line.variantId]: 'Not enough stock' },
      )
    }
    await movement(req, tenantId, orderId, line, 'reserve', {
      stockDelta: 0,
      reservedDelta: line.qty,
    })
  }
}

/** The hold becomes a sale: stock goes down, the hold is gone. */
export async function sellReservedStock(
  req: PayloadRequest,
  tenantId: string,
  orderId: string,
  lines: readonly StockLine[],
): Promise<void> {
  for (const line of lines) {
    await conditionalUpdate(req, {
      collection: 'variants',
      id: line.variantId,
      tenantId,
      update: { $inc: { stockQty: -line.qty, reservedQty: -line.qty } },
    })
    await movement(req, tenantId, orderId, line, 'sale', {
      stockDelta: -line.qty,
      reservedDelta: -line.qty,
    })
  }
}

/** Gives back a hold (unpaid order expired or cancelled before confirmation). */
export async function releaseStock(
  req: PayloadRequest,
  tenantId: string,
  orderId: string,
  lines: readonly StockLine[],
): Promise<void> {
  for (const line of lines) {
    await conditionalUpdate(req, {
      collection: 'variants',
      id: line.variantId,
      tenantId,
      update: { $inc: { reservedQty: -line.qty } },
    })
    await movement(req, tenantId, orderId, line, 'release', {
      stockDelta: 0,
      reservedDelta: -line.qty,
    })
  }
}

/** Puts sold stock back (a confirmed order cancelled before it shipped). */
export async function restock(
  req: PayloadRequest,
  tenantId: string,
  orderId: string,
  lines: readonly StockLine[],
): Promise<void> {
  for (const line of lines) {
    await conditionalUpdate(req, {
      collection: 'variants',
      id: line.variantId,
      tenantId,
      update: { $inc: { stockQty: line.qty } },
    })
    await movement(req, tenantId, orderId, line, 'cancel', {
      stockDelta: line.qty,
      reservedDelta: 0,
    })
  }
}

/** The order's lines that track stock (those sold as a variant). */
export function stockLinesOf(order: {
  items?: { variantId?: string | null; qty: number; title: string }[] | null
}): StockLine[] {
  return (order.items ?? []).flatMap((item) =>
    item.variantId ? [{ variantId: item.variantId, qty: item.qty, title: item.title }] : [],
  )
}

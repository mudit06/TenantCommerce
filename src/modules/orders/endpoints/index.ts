import type { Endpoint, PayloadRequest, Where } from 'payload'
import { z } from 'zod'

import { idOf } from '@/access'
import { withTransaction } from '@/lib/db/transaction'
import { AppError } from '@/lib/errors'
import { GST_STATES } from '@/lib/gst/gstin'
import { apiHandler, assertSameOrigin, ok, readBody, routeParam } from '@/lib/http/endpoint'
import { toRupeesString } from '@/lib/money'
import { FAILURE_REASONS, SHIPMENT_STATUSES } from '@/modules/shipping'
import { renderInvoicesHtml } from '@/modules/tax-invoicing'
import type { Order } from '@/payload-types'

import {
  FULFILLMENT_STATUSES,
  label,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
} from '../constants'
import { moveParcel, packParcel } from '../services/parcels'
import {
  bookWithShiprocket,
  cancelShiprocketBooking,
  handleCourierWebhook,
  type CourierWebhook,
} from '../services/shiprocket'
import { assertOrderAccess, orderFor } from '../services/permissions'
import { addOrderEvent } from '../services/timeline'
import { cancelOrder } from '../services/transition'

// Order screens' actions (docs/07 "Admin-side custom endpoints"). Every write checks the
// person's order role in the order's store and runs in one transaction.

const requireUser = (req: PayloadRequest) => {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 'Sign in first', 401)
}
const writer = (req: PayloadRequest) => {
  requireUser(req)
  assertSameOrigin(req)
}

const packSchema = z.object({
  items: z.array(z.object({ orderItemId: z.string(), qty: z.number().int().min(1) })).optional(),
  package: z
    .object({
      lengthMm: z.number().int().positive().optional(),
      breadthMm: z.number().int().positive().optional(),
      heightMm: z.number().int().positive().optional(),
      weightGrams: z.number().int().positive().optional(),
    })
    .optional(),
  ewayBillNo: z.string().trim().max(20).optional(),
})

const statusSchema = z.object({
  to: z.enum(SHIPMENT_STATUSES.map((s) => s.value) as [string, ...string[]]),
  carrier: z.string().trim().max(60).optional(),
  trackingNumber: z.string().trim().max(60).optional(),
  trackingUrl: z.url().optional().or(z.literal('')),
  expectedDeliveryDate: z.string().optional(),
  failureReason: z.enum(FAILURE_REASONS.map((r) => r.value) as [string, ...string[]]).optional(),
  note: z.string().trim().max(300).optional(),
})

const reasonSchema = z.object({ reason: z.string().trim().min(3, 'Say why').max(200) })
const noteSchema = z.object({ text: z.string().trim().min(1, 'Write the note').max(1000) })
const bulkSchema = z.object({ orderIds: z.array(z.string()).min(1).max(100) })
const bulkShippedSchema = z.object({
  store: z.string().min(1),
  rows: z
    .array(
      z.object({
        orderNumber: z.string().trim().min(1),
        carrier: z.string().trim().min(1),
        trackingNumber: z.string().trim().min(1),
        trackingUrl: z.string().trim().optional(),
      }),
    )
    .min(1)
    .max(500),
})

async function shipmentOrder(req: PayloadRequest, shipmentId: string, write: boolean) {
  const shipment = await req.payload
    .findByID({ collection: 'shipments', id: shipmentId, depth: 0, overrideAccess: true, req })
    .catch(() => null)
  if (!shipment) throw new AppError('NOT_FOUND', 'Parcel not found', 404)
  assertOrderAccess(req, idOf(shipment.tenant)!, write)
  return shipment
}

const csvCell = (value: unknown) => {
  const text = value === null || value === undefined ? '' : String(value)
  // A leading = + - @ would run as a formula in Excel (CSV injection)
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

/** The list's filters as a Payload query, shared by the Orders screen and its CSV export. */
export function ordersWhere(tenantId: string, params: URLSearchParams): Where {
  const and: Where[] = [{ tenant: { equals: tenantId } }]
  const tab = params.get('tab')
  const TAB_WHERE: Record<string, Where> = {
    'to-pack': {
      and: [{ status: { equals: 'confirmed' } }, { fulfillmentStatus: { equals: 'unfulfilled' } }],
    },
    packed: { fulfillmentStatus: { equals: 'packed' } },
    shipped: { fulfillmentStatus: { in: ['shipped', 'partially_shipped'] } },
    'out-for-delivery': { fulfillmentStatus: { in: ['out_for_delivery', 'delivery_failed'] } },
    delivered: { fulfillmentStatus: { equals: 'delivered' } },
    cancelled: { status: { equals: 'cancelled' } },
    returns: { fulfillmentStatus: { in: ['rto', 'returned', 'lost'] } },
    unpaid: { and: [{ status: { equals: 'pending' } }] },
  }
  if (tab && TAB_WHERE[tab]) and.push(TAB_WHERE[tab])
  const q = params.get('q')?.trim()
  if (q) {
    and.push({
      or: [
        { orderNumber: { like: q } },
        { 'contact.phone': { like: q.replace(/\s+/g, '') } },
        { 'contact.email': { like: q.toLowerCase() } },
        { 'contact.name': { like: q } },
      ],
    })
  }
  const days = Number(params.get('days'))
  if (days > 0)
    and.push({ placedAt: { greater_than: new Date(Date.now() - days * 86_400_000).toISOString() } })
  const payment = params.get('payment')
  if (payment === 'cod' || payment === 'razorpay') and.push({ paymentMethod: { equals: payment } })
  if (payment && PAYMENT_STATUSES.some((s) => s.value === payment))
    and.push({ paymentStatus: { equals: payment } })
  const state = params.get('state')
  if (state) and.push({ 'shippingAddress.stateCode': { equals: state } })
  return { and }
}

const orderInvoices = async (req: PayloadRequest, orders: readonly Order[]) => {
  const ids = orders.map((order) => idOf(order.invoice)).filter((id): id is string => Boolean(id))
  if (!ids.length) return []
  const { docs } = await req.payload.find({
    collection: 'invoices',
    where: { id: { in: ids } },
    depth: 0,
    limit: ids.length,
    pagination: false,
    overrideAccess: true,
    req,
  })
  return ids
    .map((id) => docs.find((doc) => String(doc.id) === id))
    .filter((doc) => doc !== undefined)
}

const html = (body: string) =>
  new Response(body, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
    },
  })

export const orderEndpoints: Endpoint[] = [
  {
    path: '/admin/v1/orders/:id/pack',
    method: 'post',
    handler: apiHandler(async (req) => {
      writer(req)
      const id = routeParam(req, 'id')
      await orderFor(req, id, true)
      const input = await readBody(req, packSchema)
      const shipment = await withTransaction(req, () => packParcel(req, id, input))
      return ok({ shipmentId: shipment.id }, 201)
    }),
  },
  {
    path: '/admin/v1/orders/bulk-pack',
    method: 'post',
    handler: apiHandler(async (req) => {
      writer(req)
      const { orderIds } = await readBody(req, bulkSchema)
      const results: { orderId: string; ok: boolean; message?: string }[] = []
      for (const orderId of orderIds) {
        try {
          await orderFor(req, orderId, true)
          await withTransaction(req, () => packParcel(req, orderId))
          results.push({ orderId, ok: true })
        } catch (error) {
          results.push({
            orderId,
            ok: false,
            message: error instanceof Error ? error.message : 'Failed',
          })
        }
      }
      return ok({ results })
    }),
  },
  {
    path: '/admin/v1/shipments/:id/status',
    method: 'post',
    handler: apiHandler(async (req) => {
      writer(req)
      const id = routeParam(req, 'id')
      await shipmentOrder(req, id, true)
      const input = await readBody(req, statusSchema)
      const { result } = await withTransaction(req, () =>
        moveParcel(req, id, {
          ...input,
          to: input.to as never,
          failureReason: input.failureReason as never,
          trackingUrl: input.trackingUrl || undefined,
          source: 'staff',
        }),
      )
      if (result !== 'ok') {
        throw new AppError(
          'INVALID_TRANSITION',
          'Nothing changed: the parcel is already at or past this step.',
          409,
        )
      }
      return ok({ result })
    }),
  },
  {
    // "Shipped from CSV" (docs/screens Orders): order number, courier, tracking number
    path: '/admin/v1/shipments/bulk-shipped',
    method: 'post',
    handler: apiHandler(async (req) => {
      writer(req)
      const { store, rows } = await readBody(req, bulkShippedSchema)
      assertOrderAccess(req, store, true)
      const results: { orderNumber: string; ok: boolean; message?: string }[] = []
      for (const row of rows) {
        try {
          const { docs } = await req.payload.find({
            collection: 'orders',
            where: {
              and: [{ tenant: { equals: store } }, { orderNumber: { equals: row.orderNumber } }],
            },
            limit: 1,
            depth: 0,
            pagination: false,
            // The person's own read access: only orders of the stores they work in
            overrideAccess: false,
            req,
          })
          const order = docs[0]
          if (!order) throw new AppError('NOT_FOUND', 'No such order in this store', 404)
          assertOrderAccess(req, idOf(order.tenant)!, true)
          await withTransaction(req, async () => {
            const { docs: parcels } = await req.payload.find({
              collection: 'shipments',
              where: { and: [{ order: { equals: order.id } }, { status: { equals: 'packed' } }] },
              limit: 1,
              depth: 0,
              pagination: false,
              overrideAccess: true,
              req,
            })
            const parcel = parcels[0] ?? (await packParcel(req, String(order.id)))
            await moveParcel(req, String(parcel.id), {
              to: 'shipped',
              carrier: row.carrier,
              trackingNumber: row.trackingNumber,
              trackingUrl: row.trackingUrl || undefined,
              source: 'import',
            })
          })
          results.push({ orderNumber: row.orderNumber, ok: true })
        } catch (error) {
          results.push({
            orderNumber: row.orderNumber,
            ok: false,
            message: error instanceof Error ? error.message : 'Failed',
          })
        }
      }
      return ok({ results })
    }),
  },
  {
    // "Book with Shiprocket" on a packed parcel (docs/screens Order detail)
    path: '/admin/v1/shipments/:id/book',
    method: 'post',
    handler: apiHandler(async (req) => {
      writer(req)
      const id = routeParam(req, 'id')
      await shipmentOrder(req, id, true)
      const { courierId } = await readBody(req, z.object({ courierId: z.string().optional() }))
      // No transaction around the Shiprocket calls; one save afterwards
      const shipment = await bookWithShiprocket(req, id, { courierId })
      return ok({ awb: shipment.awb, labelUrl: shipment.labelUrl })
    }),
  },
  {
    // Shiprocket tracking (docs/07): "courier", since Shiprocket refuses URLs with its name.
    // Always 200 so Shiprocket keeps sending; a wrong token is logged and ignored.
    path: '/webhooks/courier/:tenantId',
    method: 'post',
    handler: async (req) => {
      const tenantId = String(req.routeParams?.tenantId ?? '')
      let body: CourierWebhook = {}
      try {
        body = (req.json ? await req.json() : {}) as CourierWebhook
      } catch {
        body = {}
      }
      try {
        const outcome = await withTransaction(req, () =>
          handleCourierWebhook(req, tenantId, { token: req.headers.get('x-api-key'), body }),
        )
        return Response.json({ ok: true, outcome })
      } catch (error) {
        req.payload.logger.error({ err: error, msg: 'Courier webhook failed', tenantId })
        return Response.json({ ok: true, outcome: 'error' })
      }
    },
  },
  {
    path: '/admin/v1/orders/:id/cancel',
    method: 'post',
    handler: apiHandler(async (req) => {
      writer(req)
      const id = routeParam(req, 'id')
      await orderFor(req, id, true)
      const { reason } = await readBody(req, reasonSchema)
      // Booked but not picked up: free the AWB on Shiprocket first, outside our transaction
      const { docs: booked } = await req.payload.find({
        collection: 'shipments',
        where: {
          and: [
            { order: { equals: id } },
            { status: { equals: 'packed' } },
            { provider: { equals: 'shiprocket' } },
          ],
        },
        depth: 0,
        pagination: false,
        overrideAccess: true,
      })
      for (const parcel of booked) await cancelShiprocketBooking(req, parcel)
      const order = await withTransaction(req, () => cancelOrder(req, id, { reason }))
      return ok({ status: order.status })
    }),
  },
  {
    path: '/admin/v1/orders/:id/note',
    method: 'post',
    handler: apiHandler(async (req) => {
      writer(req)
      const id = routeParam(req, 'id')
      const order = await orderFor(req, id, true)
      const { text } = await readBody(req, noteSchema)
      await withTransaction(req, () =>
        addOrderEvent(req, { tenantId: idOf(order.tenant)!, orderId: id, type: 'note', text }),
      )
      return ok({ saved: true }, 201)
    }),
  },
  {
    path: '/admin/v1/orders/:id/invoice',
    method: 'get',
    handler: apiHandler(async (req) => {
      requireUser(req)
      const order = await orderFor(req, routeParam(req, 'id'), false)
      const invoices = await orderInvoices(req, [order])
      if (!invoices.length) throw new AppError('NOT_FOUND', 'This order has no invoice yet', 404)
      const { docs: credits } = await req.payload.find({
        collection: 'invoices',
        where: { and: [{ order: { equals: order.id } }, { type: { equals: 'credit-note' } }] },
        sort: 'issuedAt',
        depth: 0,
        pagination: false,
        overrideAccess: true,
        req,
      })
      return html(renderInvoicesHtml([...invoices, ...credits], `Invoice ${invoices[0]!.number}`))
    }),
  },
  {
    // "Download invoices" for the orders ticked on the list: one page per invoice
    path: '/admin/v1/orders/invoices',
    method: 'get',
    handler: apiHandler(async (req) => {
      requireUser(req)
      const ids = (new URL(req.url ?? 'http://x').searchParams.get('ids') ?? '')
        .split(',')
        .filter(Boolean)
        .slice(0, 100)
      const orders: Order[] = []
      for (const id of ids) orders.push(await orderFor(req, id, false))
      const invoices = await orderInvoices(req, orders)
      if (!invoices.length)
        throw new AppError('NOT_FOUND', 'None of these orders has an invoice yet', 404)
      return html(renderInvoicesHtml(invoices, `${invoices.length} invoices`))
    }),
  },
  {
    path: '/admin/v1/orders/export',
    method: 'get',
    handler: apiHandler(async (req) => {
      requireUser(req)
      const params = new URL(req.url ?? 'http://x').searchParams
      const tenantId = params.get('store') ?? ''
      assertOrderAccess(req, tenantId, false)
      const { docs } = await req.payload.find({
        collection: 'orders',
        where: ordersWhere(tenantId, params),
        sort: '-placedAt',
        depth: 1,
        limit: 5000,
        pagination: false,
        overrideAccess: true,
        req,
      })
      const header = [
        'Order',
        'Placed',
        'Status',
        'Payment method',
        'Payment',
        'Delivery',
        'Customer',
        'Phone',
        'Email',
        'City',
        'State',
        'Pincode',
        'Items',
        'Taxable value',
        'CGST',
        'SGST',
        'IGST',
        'Delivery charge',
        'COD fee',
        'Discount',
        'Total',
        'Refunded',
        'Invoice',
        'Buyer GSTIN',
      ]
      const rows = docs.map((order) => {
        const t = order.totals ?? {}
        const rupees = (minor: number | null | undefined) => toRupeesString(minor ?? 0)
        return [
          order.orderNumber,
          order.placedAt
            ? new Date(order.placedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
            : '',
          label(ORDER_STATUSES, order.status),
          label(PAYMENT_METHODS, order.paymentMethod),
          label(PAYMENT_STATUSES, order.paymentStatus),
          label(FULFILLMENT_STATUSES, order.fulfillmentStatus),
          order.contact?.name,
          order.contact?.phone,
          order.contact?.email,
          order.shippingAddress?.city,
          order.shippingAddress?.stateCode
            ? GST_STATES[order.shippingAddress.stateCode as keyof typeof GST_STATES]
            : '',
          order.shippingAddress?.pincode,
          (order.items ?? []).reduce((sum, item) => sum + item.qty, 0),
          rupees(t.taxableMinor),
          rupees(t.cgstMinor),
          rupees(t.sgstMinor),
          rupees(t.igstMinor),
          rupees(t.shippingMinor),
          rupees(t.codFeeMinor),
          rupees(t.discountMinor),
          rupees(t.grandTotalMinor),
          rupees(t.refundedMinor),
          typeof order.invoice === 'object' ? order.invoice?.number : '',
          order.buyerGstin,
        ]
      })
      const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
      return new Response(`﻿${csv}`, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`,
          'Cache-Control': 'private, no-store',
        },
      })
    }),
  },
]

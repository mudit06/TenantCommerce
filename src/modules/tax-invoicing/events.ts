import { on } from '@/lib/events'

import { issueInvoice } from './services/invoices'

// When invoices are made (docs/11 "GST invoice", "Events and side effects"): a prepaid order
// when it is paid; a COD order when its first parcel is packed, so the invoice exists before the
// goods leave and prints with the label. Inside the emitter's transaction: the number and the
// invoice are saved together.
export function registerTaxInvoicingEvents() {
  on('order.paid', 'tax-invoicing:invoice-on-paid', async ({ orderId }, { req }) => {
    const order = await req.payload.findByID({
      collection: 'orders',
      id: orderId,
      depth: 0,
      overrideAccess: true,
      req,
    })
    if (order.paymentMethod !== 'cod' && order.status !== 'cancelled')
      await issueInvoice(req, orderId)
  })
  on('shipment.changed', 'tax-invoicing:invoice-on-packed', async ({ orderId, to }, { req }) => {
    if (to !== 'packed') return
    const order = await req.payload.findByID({
      collection: 'orders',
      id: orderId,
      depth: 0,
      overrideAccess: true,
      req,
    })
    if (order.paymentMethod === 'cod') await issueInvoice(req, orderId)
  })
}

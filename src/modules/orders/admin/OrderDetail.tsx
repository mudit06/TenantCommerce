import type { DocumentViewServerProps } from 'payload'

import { idOf, storeSessionOf } from '@/access'
import { adminUrl } from '@/admin/paths'
import { storeRolesOf } from '@/admin/store'
import { Card, Empty, Notice, Pill, Row, Rows, type Tone } from '@/admin/ui'
import { loadConnector } from '@/connectors'
import { formatDate, formatDateAndTime, formatTime } from '@/lib/dates'
import { GST_STATES } from '@/lib/gst/gstin'
import { formatINR } from '@/lib/money'
import { SHIPMENT_STATUSES } from '@/modules/shipping'

import { label } from '../constants'
import { OrderActions } from './OrderActions'
import { deliveryPill, orderPill, paymentPill } from './orderPills'
import { OrderNote, ParcelPanel, type ParcelView } from './ParcelPanel'

const money = (minor: number | null | undefined) => formatINR(minor ?? 0, { decimals: 'always' })
const state = (code: string | null | undefined) =>
  code ? `${GST_STATES[code as keyof typeof GST_STATES] ?? code} (${code})` : '—'

/** What staff can do next with a parcel (docs/screens Order detail rule 4) */
const NEXT_STEPS: Record<string, ParcelView['next']> = {
  packed: [{ to: 'shipped', label: 'Shipped' }],
  shipped: [
    { to: 'out_for_delivery', label: 'Out for delivery', primary: true },
    { to: 'delivered', label: 'Delivered' },
    { to: 'delivery_failed', label: 'Delivery failed' },
    { to: 'rto_initiated', label: 'Coming back to us' },
    { to: 'lost', label: 'Lost in transit' },
  ],
  in_transit: [
    { to: 'out_for_delivery', label: 'Out for delivery', primary: true },
    { to: 'delivered', label: 'Delivered' },
    { to: 'delivery_failed', label: 'Delivery failed' },
    { to: 'rto_initiated', label: 'Coming back to us' },
    { to: 'lost', label: 'Lost in transit' },
  ],
  out_for_delivery: [
    { to: 'delivered', label: 'Delivered', primary: true },
    { to: 'delivery_failed', label: 'Delivery failed' },
  ],
  delivery_failed: [
    { to: 'out_for_delivery', label: 'Out again (re-attempt)', primary: true },
    { to: 'rto_initiated', label: 'Return to us' },
  ],
  rto_initiated: [
    { to: 'rto_delivered', label: 'Back with us', primary: true },
    { to: 'lost', label: 'Lost in transit' },
  ],
}

const parcelTone = (status: string): Tone =>
  status === 'delivered'
    ? 'success'
    : status === 'delivery_failed' || status === 'lost' || status === 'cancelled'
      ? 'danger'
      : status === 'packed' || status.startsWith('rto')
        ? 'warning'
        : 'info'

type ChargePart = { gstRatePercent: number; amountMinor: number }

/**
 * Order detail (docs/screens/vendor-cms.md `cms-order`): what was bought with its GST, payment,
 * parcels, invoice, the customer and every event so far. Replaces Payload's edit form: an order
 * is a record, changed only through the checked actions here.
 */
export async function OrderDetail({ initPageResult }: DocumentViewServerProps) {
  const { req } = initPageResult
  const id = initPageResult.docID ? String(initPageResult.docID) : null
  const order = id
    ? await req.payload
        .findByID({
          collection: 'orders',
          id,
          depth: 0,
          user: req.user,
          overrideAccess: false,
          req,
        })
        .catch(() => null)
    : null
  if (!order) return <Notice tone="danger">This order can’t be opened.</Notice>
  const tenantId = idOf(order.tenant)!
  const session = storeSessionOf(req.user)
  const roles = storeRolesOf(req.user, tenantId)
  const canWrite = session
    ? session.mode === 'manage'
    : roles.some((role) => role === 'owner' || role === 'manager' || role === 'order-manager')

  const [
    { docs: events },
    { docs: parcels },
    { docs: payments },
    { docs: refunds },
    { docs: documents },
    history,
    shiprocket,
  ] = await Promise.all([
    req.payload.find({
      collection: 'order-events',
      where: { order: { equals: id } },
      sort: 'at',
      depth: 1,
      pagination: false,
      overrideAccess: true,
    }),
    req.payload.find({
      collection: 'shipments',
      where: { order: { equals: id } },
      sort: 'createdAt',
      depth: 0,
      pagination: false,
      overrideAccess: true,
    }),
    req.payload.find({
      collection: 'transactions',
      where: { order: { equals: id } },
      sort: '-createdAt',
      depth: 0,
      pagination: false,
      overrideAccess: true,
    }),
    req.payload.find({
      collection: 'refunds',
      where: { order: { equals: id } },
      sort: 'createdAt',
      depth: 0,
      pagination: false,
      overrideAccess: true,
    }),
    req.payload.find({
      collection: 'invoices',
      where: { order: { equals: id } },
      sort: 'issuedAt',
      depth: 0,
      pagination: false,
      overrideAccess: true,
    }),
    order.contact?.email || order.contact?.phone
      ? req.payload.count({
          collection: 'orders',
          where: {
            and: [
              { tenant: { equals: tenantId } },
              { placedAt: { less_than_equal: order.placedAt ?? order.createdAt } },
              {
                or: [
                  ...(order.contact?.email
                    ? [{ 'contact.email': { equals: order.contact.email } }]
                    : []),
                  ...(order.contact?.phone
                    ? [{ 'contact.phone': { equals: order.contact.phone } }]
                    : []),
                ],
              },
            ],
          },
          overrideAccess: true,
        })
      : Promise.resolve({ totalDocs: 1 }),
    loadConnector(req.payload, tenantId, 'shiprocket').catch(() => null),
  ])

  const totals = order.totals ?? {}
  const intra = order.placeOfSupplyStateCode === order.sellerStateCode
  // Tax by rate across goods and charges, as the invoice shows it
  const taxByRate = new Map<number, number>()
  for (const item of order.items ?? []) {
    const rate = item.gstRate ?? 0
    taxByRate.set(
      rate,
      (taxByRate.get(rate) ?? 0) +
        (item.cgstMinor ?? 0) +
        (item.sgstMinor ?? 0) +
        (item.igstMinor ?? 0),
    )
  }
  for (const charge of (order.charges as
    | { parts: (ChargePart & { cgstMinor: number; sgstMinor: number; igstMinor: number })[] }[]
    | null) ?? []) {
    for (const part of charge.parts) {
      taxByRate.set(
        part.gstRatePercent,
        (taxByRate.get(part.gstRatePercent) ?? 0) +
          part.cgstMinor +
          part.sgstMinor +
          part.igstMinor,
      )
    }
  }
  const captured = payments.find((p) => p.status !== 'created' && p.status !== 'failed')
  const invoice = documents.find((doc) => doc.type === 'tax-invoice')
  const creditNotes = documents.filter((doc) => doc.type === 'credit-note')
  const refundable = Math.max(0, (totals.paidMinor ?? 0) - (totals.refundedMinor ?? 0))
  const packedQty = new Map<string, number>()
  for (const parcel of parcels) {
    if (parcel.status === 'cancelled') continue
    for (const item of parcel.items ?? [])
      packedQty.set(item.orderItemId, (packedQty.get(item.orderItemId) ?? 0) + item.qty)
  }
  const unpacked = (order.items ?? []).some(
    (item) => (packedQty.get(String(item.id)) ?? 0) < item.qty,
  )
  const canPack = (order.status === 'confirmed' || order.status === 'processing') && unpacked
  const shippedYet = parcels.some((p) => !['packed', 'cancelled'].includes(p.status))
  const canCancel =
    order.status !== 'cancelled' &&
    order.status !== 'completed' &&
    (!shippedYet || order.fulfillmentStatus === 'returned')
  const address = order.shippingAddress
  const status = orderPill(order)
  const payment = paymentPill(order)
  const delivery = deliveryPill(order)
  const placed = order.placedAt ?? order.createdAt

  const parcelViews: ParcelView[] = parcels.map((parcel) => ({
    id: String(parcel.id),
    status: parcel.status,
    statusLabel: label(SHIPMENT_STATUSES, parcel.status),
    tone: parcelTone(parcel.status),
    items: (parcel.items ?? [])
      .map((item) => `${item.title}${item.qty > 1 ? ` × ${item.qty}` : ''}`)
      .join(', '),
    carrier: parcel.carrier ?? null,
    trackingNumber: parcel.trackingNumber ?? null,
    trackingUrl: parcel.trackingUrl ?? null,
    attempts: parcel.attempts ?? 0,
    provider: parcel.provider ?? 'manual',
    canBook: Boolean(shiprocket) && parcel.status === 'packed' && !parcel.awb,
    labelUrl: parcel.labelUrl ?? null,
    pickup: parcel.pickupScheduledFor ? formatDateAndTime(parcel.pickupScheduledFor) : null,
    next: NEXT_STEPS[parcel.status] ?? [],
    events: (parcel.events ?? []).map((event) => ({
      at: formatDateAndTime(event.at),
      text: `${label(SHIPMENT_STATUSES, event.status)}${event.location ? `, ${event.location}` : ''}${event.note ? ` · ${event.note}` : ''}`,
    })),
  }))

  return (
    <div className="te-page te-order">
      <header className="te-page__header">
        <div className="te-page__heading">
          <p className="te-page__eyebrow">
            <a className="te-link" href={adminUrl.collection('orders')}>
              Orders
            </a>
          </p>
          <h1 className="te-page__title te-order__title">
            Order {order.orderNumber} <Pill tone={status.tone}>{status.text}</Pill>
            <Pill tone={payment.tone}>{payment.text}</Pill>
            <Pill tone={delivery.tone}>{delivery.text}</Pill>
          </h1>
          <p className="te-page__subtitle">
            Placed {formatDate(placed)} at {formatTime(placed)} on the online store
            {order.paymentMode === 'test' ? ' · Razorpay test mode' : ''}
          </p>
        </div>
      </header>
      <OrderActions
        canCancel={canCancel}
        canPack={canPack}
        canRefund={refundable > 0}
        canWrite={canWrite}
        cod={order.paymentMethod === 'cod'}
        invoiceHref={invoice ? `/api/admin/v1/orders/${id}/invoice` : null}
        orderId={String(id)}
        refundableMinor={refundable}
      />
      {order.status === 'pending' ? (
        <Notice tone="warning">
          Waiting for online payment. Unpaid orders are cancelled
          {order.expiresAt ? ` after ${formatTime(order.expiresAt)}` : ' after 30 minutes'} and the
          stock goes back.
        </Notice>
      ) : null}

      <div className="te-grid te-grid--2-1">
        <div className="te-stack">
          <Card className="te-card--table" title="Items">
            <div className="te-table-scroll">
              <table className="te-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="te-num">Price</th>
                    <th className="te-num">Qty</th>
                    <th className="te-num">GST</th>
                    <th className="te-num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(order.items ?? []).map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="te-order__product">
                          {item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img alt="" className="te-order__thumb" src={item.imageUrl} />
                          ) : (
                            <span className="te-order__thumb" />
                          )}
                          <div>
                            {item.productId ? (
                              <a
                                className="te-strong te-link"
                                href={adminUrl.doc('products', item.productId)}
                              >
                                {item.title}
                              </a>
                            ) : (
                              <span className="te-strong">{item.title}</span>
                            )}
                            <div className="te-muted te-small">
                              {[item.options, item.sku].filter(Boolean).join(' · ')}
                            </div>
                            {item.discountMinor ? (
                              <div className="te-text--success te-small">
                                − {money(item.discountMinor)} offer
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="te-num">{money(item.unitMinor)}</td>
                      <td className="te-num">{item.qty}</td>
                      <td className="te-num">{item.gstRate}%</td>
                      <td className="te-num">{money(item.lineTotalMinor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="te-totals">
              <div>
                <dt>Items total, incl. GST</dt>
                <dd>{money(totals.itemsMinor)}</dd>
              </div>
              {totals.discountMinor ? (
                <div>
                  <dt>Discounts</dt>
                  <dd>− {money(totals.discountMinor)}</dd>
                </div>
              ) : null}
              <div>
                <dt>Delivery</dt>
                <dd>{money(totals.shippingMinor)}</dd>
              </div>
              {totals.codFeeMinor ? (
                <div>
                  <dt>Cash on delivery fee</dt>
                  <dd>{money(totals.codFeeMinor)}</dd>
                </div>
              ) : null}
              <div>
                <dt>Taxable value</dt>
                <dd>{money(totals.taxableMinor)}</dd>
              </div>
              {[...taxByRate.entries()]
                .filter(([, tax]) => tax > 0)
                .sort(([a], [b]) => a - b)
                .flatMap(([rate, tax]) =>
                  intra
                    ? [
                        <div key={`c${rate}`}>
                          <dt>CGST {rate / 2}%</dt>
                          <dd>{money(Math.floor(tax / 2))}</dd>
                        </div>,
                        <div key={`s${rate}`}>
                          <dt>SGST {rate / 2}%</dt>
                          <dd>{money(tax - Math.floor(tax / 2))}</dd>
                        </div>,
                      ]
                    : [
                        <div key={`i${rate}`}>
                          <dt>IGST {rate}%</dt>
                          <dd>{money(tax)}</dd>
                        </div>,
                      ],
                )}
              <div className="te-totals__grand">
                <dt>Order total</dt>
                <dd>{money(totals.grandTotalMinor)}</dd>
              </div>
              {totals.refundedMinor ? (
                <div>
                  <dt>Refunded</dt>
                  <dd>− {money(totals.refundedMinor)}</dd>
                </div>
              ) : null}
            </dl>
            <p className="te-muted te-small te-order__supply">
              Place of supply {state(order.placeOfSupplyStateCode)}. Store in{' '}
              {state(order.sellerStateCode)}
              {intra ? ': CGST and SGST.' : ': IGST.'}
            </p>
          </Card>

          <Card title="Shipment">
            {parcelViews.length === 0 ? (
              <Empty>
                {order.status === 'pending'
                  ? 'Not shipped: waiting for payment.'
                  : order.status === 'cancelled'
                    ? 'Cancelled before it shipped.'
                    : 'Not shipped yet. Pack it to give the courier the parcel.'}
              </Empty>
            ) : (
              <div className="te-stack">
                {parcelViews.map((parcel) => (
                  <ParcelPanel canWrite={canWrite} key={parcel.id} parcel={parcel} />
                ))}
              </div>
            )}
            {order.shippingMethod?.zoneName || order.shippingMethod?.etaMaxDays ? (
              <p className="te-muted te-small">
                Promised at checkout:{' '}
                {[
                  order.shippingMethod.zoneName,
                  order.shippingMethod.etaMaxDays
                    ? `${order.shippingMethod.etaMinDays ?? order.shippingMethod.etaMaxDays} to ${order.shippingMethod.etaMaxDays} days`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            ) : null}
          </Card>

          <Card title="Timeline">
            <ol className="te-timeline">
              {events.map((event) => {
                const by =
                  event.byUser && typeof event.byUser === 'object'
                    ? (event.byUser.name ?? event.byUser.email)
                    : event.byLabel
                return (
                  <li key={event.id}>
                    <span className="te-muted te-small te-nowrap">
                      {formatDateAndTime(event.at)}
                    </span>
                    <span>
                      {event.text}
                      {by && by !== 'system' ? (
                        <span className="te-muted te-small"> · {by}</span>
                      ) : null}
                    </span>
                  </li>
                )
              })}
            </ol>
            {canWrite ? <OrderNote orderId={String(id)} /> : null}
          </Card>
        </div>

        <div className="te-stack">
          <Card title="Customer">
            <p className="te-strong">{order.contact?.name}</p>
            <p className="te-small">{order.contact?.email}</p>
            <p className="te-small">
              {order.contact?.phone}
              {history.totalDocs > 1 ? ` · order ${history.totalDocs} from them` : ' · first order'}
            </p>
            {order.whatsappOptIn ? (
              <p className="te-muted te-small">Agreed to order updates on WhatsApp</p>
            ) : null}
            {order.notes ? <Notice tone="info">Note from the shopper: {order.notes}</Notice> : null}
          </Card>
          <Card title="Delivery address">
            <p>
              {[address?.name, address?.line1, address?.line2, address?.landmark]
                .filter(Boolean)
                .join(', ')}
            </p>
            <p>
              {address?.city},{' '}
              {address?.stateCode ? GST_STATES[address.stateCode as keyof typeof GST_STATES] : ''}{' '}
              {address?.pincode}
            </p>
            <p className="te-muted te-small">
              {order.billingSameAsShipping !== false
                ? 'Billing: same as delivery'
                : 'Billing address differs'}{' '}
              ·{' '}
              {order.buyerGstin
                ? `GSTIN ${order.buyerGstin} (${order.buyerLegalName})`
                : 'No GSTIN (personal order)'}
            </p>
          </Card>
          <Card title="Payment">
            <dl className="te-dl te-small">
              <dt>Method</dt>
              <dd>
                {order.paymentMethod === 'cod'
                  ? 'Cash on delivery'
                  : `Razorpay${captured?.methodDetail ? ` · ${captured.methodDetail}` : ''}`}
              </dd>
              {captured?.providerPaymentId ? (
                <>
                  <dt>Payment ID</dt>
                  <dd className="te-mono">{captured.providerPaymentId}</dd>
                </>
              ) : null}
              {captured?.capturedAt ? (
                <>
                  <dt>Captured</dt>
                  <dd>{formatDateAndTime(captured.capturedAt)}</dd>
                </>
              ) : null}
              <dt>Amount</dt>
              <dd>{money(totals.grandTotalMinor)}</dd>
              <dt>Paid</dt>
              <dd>{money(totals.paidMinor)}</dd>
            </dl>
            {refunds.length ? (
              <Rows>
                {refunds.map((refund) => (
                  <Row
                    aside={
                      <Pill
                        tone={
                          refund.status === 'processed'
                            ? 'success'
                            : refund.status === 'failed'
                              ? 'danger'
                              : 'warning'
                        }
                      >
                        {refund.status}
                      </Pill>
                    }
                    key={refund.id}
                    primary={`Refund ${money(refund.amountMinor)}`}
                    secondary={`${refund.reason}${refund.reference ? ` · ${refund.reference}` : ''}`}
                  />
                ))}
              </Rows>
            ) : null}
          </Card>
          <Card title="Invoice">
            {invoice ? (
              <Rows>
                <Row
                  href={`/api/admin/v1/orders/${id}/invoice`}
                  primary={<span className="te-mono">{invoice.number}</span>}
                  secondary={`Tax invoice · ${formatDate(invoice.issuedAt)}`}
                />
                {creditNotes.map((note) => (
                  <Row
                    href={`/api/admin/v1/orders/${id}/invoice`}
                    key={note.id}
                    primary={<span className="te-mono">{note.number}</span>}
                    secondary={`Credit note · ${formatDate(note.issuedAt)}`}
                  />
                ))}
              </Rows>
            ) : (
              <Empty>
                {order.paymentMethod === 'cod'
                  ? 'Made when the parcel is packed.'
                  : 'Made as soon as the payment is confirmed.'}
              </Empty>
            )}
          </Card>
          <Card title="Offers and referral">
            <dl className="te-dl te-small">
              <dt>Scheme</dt>
              <dd>
                {order.appliedOffers?.find((o) => o.kind === 'scheme')?.name ?? 'none applied'}
              </dd>
              <dt>Coupon</dt>
              <dd>{order.couponCode ?? 'none'}</dd>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  )
}

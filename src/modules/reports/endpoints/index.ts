import type { Endpoint, PayloadRequest } from 'payload'

import { csvResponse } from '@/lib/csv'
import { AppError } from '@/lib/errors'
import { apiHandler } from '@/lib/http/endpoint'

import { assertReportAccess, buildReport, hsnSummary, monthRange } from '../services/report'

// Reports' exports (docs/07 `GET /reports/sales`): the month's orders, and the HSN summary for
// GSTR-1. Kept out of the module's index: these import the HTTP helpers.

const params = (req: PayloadRequest) => {
  const url = new URL(req.url ?? 'http://x')
  const store = url.searchParams.get('store') ?? ''
  if (!store) throw new AppError('VALIDATION_FAILED', 'Which store?', 400)
  return { store, month: url.searchParams.get('month') }
}

/** Rupees with two decimals, as GST returns and accountants expect: 646.00, -5.25 */
const rupees = (minor: number | null | undefined) => {
  const value = minor ?? 0
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
}
const istDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : ''

export const reportEndpoints: Endpoint[] = [
  {
    path: '/admin/v1/reports/orders.csv',
    method: 'get',
    handler: apiHandler(async (req) => {
      const { store, month } = params(req)
      assertReportAccess(req, store)
      const report = await buildReport(req.payload, store, month)
      const rows: unknown[][] = [
        [
          'Order',
          'Placed',
          'Paid',
          'Payment',
          'Status',
          'Place of supply',
          'Items',
          'Discount',
          'Delivery',
          'COD fee',
          'Taxable value',
          'CGST',
          'SGST',
          'IGST',
          'Total',
          'Refunded',
          'Coupon',
          'Affiliate',
        ],
        ...report.orderRows.map((o) => [
          o.orderNumber,
          istDate(o.placedAt),
          istDate(o.paidAt),
          o.paymentMethod === 'cod' ? 'Cash on delivery' : 'Online',
          o.status,
          o.placeOfSupplyStateCode,
          (o.items ?? []).reduce((s, i) => s + i.qty, 0),
          rupees(o.totals?.discountMinor),
          rupees(o.totals?.shippingMinor),
          rupees(o.totals?.codFeeMinor),
          rupees(o.totals?.taxableMinor),
          rupees(o.totals?.cgstMinor),
          rupees(o.totals?.sgstMinor),
          rupees(o.totals?.igstMinor),
          rupees(o.totals?.grandTotalMinor),
          rupees(o.totals?.refundedMinor),
          o.couponCode ?? '',
          o.referral?.affiliate ? 'Yes' : '',
        ]),
      ]
      return csvResponse(rows, `orders-${report.month.key}.csv`)
    }),
  },
  {
    path: '/admin/v1/reports/hsn.csv',
    method: 'get',
    handler: apiHandler(async (req) => {
      const { store, month } = params(req)
      assertReportAccess(req, store)
      const range = monthRange(month)
      const hsn = await hsnSummary(req.payload, store, range.from, range.to)
      // The columns of GSTR-1 table 12 (HSN-wise summary of outward supplies)
      const rows: unknown[][] = [
        [
          'HSN',
          'Description',
          'UQC',
          'Total Quantity',
          'Total Value',
          'Rate',
          'Taxable Value',
          'Integrated Tax Amount',
          'Central Tax Amount',
          'State/UT Tax Amount',
          'Cess Amount',
        ],
        ...hsn.map((r) => [
          r.hsn,
          r.description.slice(0, 30),
          'NOS-NUMBERS',
          r.qty,
          rupees(r.totalMinor),
          r.ratePercent,
          rupees(r.taxableMinor),
          rupees(r.igstMinor),
          rupees(r.cgstMinor),
          rupees(r.sgstMinor),
          '0.00',
        ]),
      ]
      return csvResponse(rows, `gstr1-hsn-${range.key}.csv`)
    }),
  },
]

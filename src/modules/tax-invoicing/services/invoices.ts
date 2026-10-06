import type { Payload, PayloadRequest } from 'payload'

import { idOf } from '@/access'
import { GST_STATES } from '@/lib/gst/gstin'
import { splitInclusive, splitTax } from '@/lib/gst/tax'
import { allocate } from '@/lib/money'
import { rupeesInWords } from '@/lib/money/words'
import type { Invoice, Order } from '@/payload-types'

import { nextConsecutiveNumber } from './counters'

// GST tax invoices and credit notes (docs/11 "GST invoice", CGST Rules rule 46). The invoice is
// a snapshot: seller, buyer, place of supply, lines with HSN, taxable value, rate and tax, and
// totals, taken from the order (itself a snapshot of checkout), so a reprint never changes.
// Numbers run per store per financial year with no gaps: INV/26-27/00042.

export type InvoiceLine = {
  description: string
  hsnCode: string
  qty: number
  unit: string
  /** One piece, GST included */
  unitMinor: number | null
  grossMinor: number
  discountMinor: number
  taxableMinor: number
  ratePercent: number
  cgstMinor: number
  sgstMinor: number
  igstMinor: number
  totalMinor: number
}

export type InvoiceTotals = {
  taxableMinor: number
  cgstMinor: number
  sgstMinor: number
  igstMinor: number
  taxMinor: number
  discountMinor: number
  roundOffMinor: number
  grandTotalMinor: number
}

export type PartySnapshot = {
  name: string
  legalName?: string | null
  gstin?: string | null
  address: string[]
  stateCode: string | null
  stateName: string | null
  email?: string | null
  phone?: string | null
}

/** "2026-27" for any date from 1 April 2026 to 31 March 2027, in India's time zone. */
export function financialYear(at: Date): string {
  const ist = new Date(at.getTime() + 5.5 * 60 * 60 * 1000)
  const year = ist.getUTCFullYear()
  const start = ist.getUTCMonth() >= 3 ? year : year - 1
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`
}

/** INV/26-27/00042: within GST's 16 characters for a prefix of up to 4 (docs/06 invoices). */
export function invoiceNumber(prefix: string, fy: string, sequence: number): string {
  const short = `${fy.slice(2, 4)}-${fy.slice(5, 7)}`
  const number = `${prefix}/${short}/${String(sequence).padStart(5, '0')}`
  if (number.length > 16) throw new Error(`Invoice number ${number} is longer than 16 characters`)
  return number
}

const stateName = (code: string | null | undefined) =>
  code ? (GST_STATES[code as keyof typeof GST_STATES] ?? null) : null

const addressLines = (
  a:
    | {
        line1?: string | null
        line2?: string | null
        landmark?: string | null
        city?: string | null
        stateCode?: string | null
        pincode?: string | null
      }
    | null
    | undefined,
): string[] =>
  a
    ? [
        a.line1,
        a.line2,
        a.landmark,
        [a.city, [stateName(a.stateCode), a.pincode].filter(Boolean).join(' ')]
          .filter(Boolean)
          .join(', '),
      ].filter((line): line is string => Boolean(line))
    : []

type ChargePart = {
  lineKey: string
  gstRatePercent: number
  amountMinor: number
  taxableMinor: number
  cgstMinor: number
  sgstMinor: number
  igstMinor: number
  taxMinor: number
}
type Charge = { kind: 'shipping' | 'cod'; parts: ChargePart[] }

/** The order's goods and its delivery and COD charges, as invoice lines. */
export function invoiceLinesFor(order: Pick<Order, 'items' | 'charges'>): InvoiceLine[] {
  const items = order.items ?? []
  const lines: InvoiceLine[] = items.map((item) => ({
    description:
      [item.title, item.options].filter(Boolean).join(' · ') +
      // The code once: titles often end with the model number already
      (item.sku && !item.title.includes(item.sku) ? ` (${item.sku})` : ''),
    hsnCode: item.hsnCode ?? '',
    qty: item.qty,
    unit: 'Nos',
    unitMinor: item.unitMinor ?? null,
    grossMinor: (item.unitMinor ?? 0) * item.qty,
    discountMinor: item.discountMinor ?? 0,
    taxableMinor: item.taxableMinor ?? 0,
    ratePercent: item.gstRate ?? 0,
    cgstMinor: item.cgstMinor ?? 0,
    sgstMinor: item.sgstMinor ?? 0,
    igstMinor: item.igstMinor ?? 0,
    totalMinor: item.lineTotalMinor ?? 0,
  }))
  // A composite supply: delivery and COD take the goods' rate, one line per rate (docs/11)
  const hsnByRate = new Map(lines.map((line) => [line.ratePercent, line.hsnCode]))
  for (const charge of (order.charges as Charge[] | null) ?? []) {
    const byRate = new Map<number, ChargePart[]>()
    for (const part of charge.parts)
      byRate.set(part.gstRatePercent, [...(byRate.get(part.gstRatePercent) ?? []), part])
    for (const [rate, parts] of byRate) {
      const sum = (key: keyof ChargePart) =>
        parts.reduce((total, part) => total + Number(part[key]), 0)
      lines.push({
        description: charge.kind === 'shipping' ? 'Delivery charges' : 'Cash on delivery fee',
        hsnCode: hsnByRate.get(rate) ?? '',
        qty: 1,
        unit: 'Nos',
        unitMinor: null,
        grossMinor: sum('amountMinor'),
        discountMinor: 0,
        taxableMinor: sum('taxableMinor'),
        ratePercent: rate,
        cgstMinor: sum('cgstMinor'),
        sgstMinor: sum('sgstMinor'),
        igstMinor: sum('igstMinor'),
        totalMinor: sum('amountMinor'),
      })
    }
  }
  return lines
}

export function totalsOf(lines: readonly InvoiceLine[]): InvoiceTotals {
  const sum = (key: keyof InvoiceLine) =>
    lines.reduce((total, line) => total + Number(line[key] ?? 0), 0)
  const cgstMinor = sum('cgstMinor')
  const sgstMinor = sum('sgstMinor')
  const igstMinor = sum('igstMinor')
  return {
    taxableMinor: sum('taxableMinor'),
    cgstMinor,
    sgstMinor,
    igstMinor,
    taxMinor: cgstMinor + sgstMinor + igstMinor,
    discountMinor: sum('discountMinor'),
    roundOffMinor: 0,
    grandTotalMinor: sum('totalMinor'),
  }
}

async function parties(payload: Payload, order: Order, req?: PayloadRequest) {
  const tenantId = idOf(order.tenant)!
  const [tenant, settings] = await Promise.all([
    payload.findByID({ collection: 'tenants', id: tenantId, depth: 0, overrideAccess: true, req }),
    payload
      .find({
        collection: 'site-settings',
        where: { tenant: { equals: tenantId } },
        limit: 1,
        depth: 1,
        pagination: false,
        overrideAccess: true,
        req,
      })
      .then((r) => r.docs[0] ?? null),
  ])
  const seller: PartySnapshot & {
    storeName: string
    signatory: string | null
    signatureUrl: string | null
    footerNote: string | null
  } = {
    name: settings?.storeName ?? tenant.name,
    storeName: settings?.storeName ?? tenant.name,
    legalName: tenant.legalName ?? tenant.name,
    gstin: tenant.gstin ?? null,
    address: addressLines(tenant.registeredAddress),
    stateCode: tenant.stateCode ?? null,
    stateName: stateName(tenant.stateCode),
    email: settings?.contact?.email ?? tenant.supportEmail ?? null,
    phone: settings?.contact?.phone ?? tenant.supportPhone ?? null,
    signatory: settings?.invoice?.authorisedSignatory ?? null,
    signatureUrl:
      settings?.invoice?.signature && typeof settings.invoice.signature === 'object'
        ? (settings.invoice.signature.url ?? null)
        : null,
    footerNote: settings?.invoice?.footerNote ?? null,
  }
  const billing =
    order.billingSameAsShipping !== false || !order.billingAddress
      ? order.shippingAddress
      : order.billingAddress
  const buyer: PartySnapshot = {
    name: billing?.name ?? order.contact?.name ?? '',
    legalName: order.buyerLegalName ?? null,
    gstin: order.buyerGstin ?? null,
    address: addressLines(billing),
    stateCode: billing?.stateCode ?? null,
    stateName: stateName(billing?.stateCode),
    email: order.contact?.email ?? null,
    phone: order.contact?.phone ?? null,
  }
  const shipTo: PartySnapshot = {
    name: order.shippingAddress?.name ?? '',
    address: addressLines(order.shippingAddress),
    stateCode: order.shippingAddress?.stateCode ?? null,
    stateName: stateName(order.shippingAddress?.stateCode),
  }
  return { tenantId, seller, buyer, shipTo, prefix: settings?.invoice?.prefix || 'INV' }
}

/**
 * The order's tax invoice, made once (prepaid: when paid; COD: when its first parcel is packed,
 * docs/11). Inside the caller's transaction so the number and the invoice are saved together.
 */
export async function issueInvoice(
  req: PayloadRequest,
  orderId: string,
  at = new Date(),
): Promise<Invoice> {
  const order = await req.payload.findByID({
    collection: 'orders',
    id: orderId,
    depth: 0,
    overrideAccess: true,
    req,
  })
  if (order.invoice) {
    return req.payload.findByID({
      collection: 'invoices',
      id: idOf(order.invoice)!,
      depth: 0,
      overrideAccess: true,
      req,
    })
  }
  const { tenantId, seller, buyer, shipTo, prefix } = await parties(req.payload, order, req)
  const lines = invoiceLinesFor(order)
  const totals = totalsOf(lines)
  const fy = financialYear(at)
  const sequence = await nextConsecutiveNumber(req, tenantId, `invoice:${fy}`)
  const invoice = await req.payload.create({
    collection: 'invoices',
    data: {
      tenant: tenantId,
      order: orderId,
      type: 'tax-invoice',
      number: invoiceNumber(prefix, fy, sequence),
      financialYear: fy,
      issuedAt: at.toISOString(),
      seller,
      buyer: { ...buyer, shipTo },
      placeOfSupply: {
        stateCode: order.placeOfSupplyStateCode,
        stateName: stateName(order.placeOfSupplyStateCode),
        orderNumber: order.orderNumber,
      },
      lines,
      totals,
      amountInWords: rupeesInWords(totals.grandTotalMinor),
    },
    overrideAccess: true,
    req,
  })
  await req.payload.update({
    collection: 'orders',
    id: orderId,
    data: { invoice: invoice.id },
    overrideAccess: true,
    req,
  })
  return invoice
}

/** Scales invoice lines down to `amountMinor`, spread by value, each part taxed at its rate. */
export function creditLines(
  lines: readonly InvoiceLine[],
  amountMinor: number,
  intraState: boolean,
): InvoiceLine[] {
  const full = lines.reduce((sum, line) => sum + line.totalMinor, 0)
  if (amountMinor >= full) return lines.map((line) => ({ ...line }))
  const shares = allocate(
    amountMinor,
    lines.map((line) => Math.max(line.totalMinor, 0)),
  )
  return lines
    .map((line, index) => {
      const share = shares[index] ?? 0
      const { taxableMinor, taxMinor } = splitInclusive(share, line.ratePercent)
      return {
        ...line,
        unitMinor: null,
        grossMinor: share,
        discountMinor: 0,
        taxableMinor,
        ...splitTax(taxMinor, intraState),
        totalMinor: share,
      }
    })
    .filter((line) => line.totalMinor > 0)
}

/** A credit note against the order's invoice for money given back (docs/11 "Refunds"). */
export async function issueCreditNote(
  req: PayloadRequest,
  orderId: string,
  { amountMinor, reason, at = new Date() }: { amountMinor: number; reason: string; at?: Date },
): Promise<Invoice | null> {
  const order = await req.payload.findByID({
    collection: 'orders',
    id: orderId,
    depth: 0,
    overrideAccess: true,
    req,
  })
  if (!order.invoice) return null
  const original = await req.payload.findByID({
    collection: 'invoices',
    id: idOf(order.invoice)!,
    depth: 0,
    overrideAccess: true,
    req,
  })
  const intraState = order.placeOfSupplyStateCode === order.sellerStateCode
  const lines = creditLines(original.lines as InvoiceLine[], amountMinor, intraState)
  const totals = totalsOf(lines)
  const fy = financialYear(at)
  const { tenantId, prefix } = await parties(req.payload, order, req)
  const sequence = await nextConsecutiveNumber(req, tenantId, `credit-note:${fy}`)
  const cnPrefix = prefix === 'INV' ? 'CN' : `${prefix.slice(0, 2)}CN`
  return req.payload.create({
    collection: 'invoices',
    data: {
      tenant: tenantId,
      order: orderId,
      type: 'credit-note',
      againstInvoice: original.id,
      number: invoiceNumber(cnPrefix, fy, sequence),
      financialYear: fy,
      issuedAt: at.toISOString(),
      seller: original.seller,
      buyer: original.buyer,
      placeOfSupply: { ...(original.placeOfSupply as object), reason },
      lines,
      totals,
      amountInWords: rupeesInWords(totals.grandTotalMinor),
    },
    overrideAccess: true,
    req,
  })
}

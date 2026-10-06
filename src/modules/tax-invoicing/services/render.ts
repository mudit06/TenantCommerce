import { formatINR } from '@/lib/money'
import type { Invoice } from '@/payload-types'

import type { InvoiceLine, InvoiceTotals, PartySnapshot } from './invoices'

// The printable GST invoice and credit note (docs/11 "GST invoice": rule 46 contents). An HTML
// page laid out for A4 that the browser prints or saves as PDF; several invoices print one per
// page. Drawn only from the invoice's snapshot, so a reprint is always the same document.

const esc = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  )
const money = (minor: number) => formatINR(minor, { decimals: 'always' }).replace('₹', '')
const date = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  })

type Seller = PartySnapshot & {
  storeName?: string
  signatory?: string | null
  signatureUrl?: string | null
  footerNote?: string | null
}
type Buyer = PartySnapshot & { shipTo?: PartySnapshot }

function party(title: string, p: PartySnapshot | undefined) {
  if (!p) return ''
  return `<div class="party"><h3>${esc(title)}</h3>
    <p class="strong">${esc(p.legalName || p.name)}</p>
    ${p.legalName && p.legalName !== p.name ? `<p>${esc(p.name)}</p>` : ''}
    ${p.address.map((line) => `<p>${esc(line)}</p>`).join('')}
    ${p.stateName ? `<p>State: ${esc(p.stateName)} (${esc(p.stateCode)})</p>` : ''}
    ${p.gstin ? `<p>GSTIN: <b>${esc(p.gstin)}</b></p>` : title.startsWith('Bill') ? '<p>GSTIN: Unregistered</p>' : ''}
  </div>`
}

function invoiceSection(invoice: Invoice): string {
  const seller = invoice.seller as Seller
  const buyer = invoice.buyer as Buyer
  const pos = invoice.placeOfSupply as {
    stateCode?: string
    stateName?: string
    orderNumber?: string
    reason?: string
  }
  const lines = invoice.lines as InvoiceLine[]
  const totals = invoice.totals as InvoiceTotals
  const intra = totals.igstMinor === 0
  const credit = invoice.type === 'credit-note'
  const taxHeads = intra ? '<th>CGST</th><th>SGST</th>' : '<th>IGST</th>'
  const rows = lines
    .map(
      (line, i) => `<tr>
      <td>${i + 1}</td><td class="desc">${esc(line.description)}</td><td>${esc(line.hsnCode)}</td>
      <td class="num">${line.qty} ${esc(line.unit)}</td>
      <td class="num">${money(line.grossMinor)}</td><td class="num">${line.discountMinor ? money(line.discountMinor) : '–'}</td>
      <td class="num">${money(line.taxableMinor)}</td><td class="num">${line.ratePercent}%</td>
      ${intra ? `<td class="num">${money(line.cgstMinor)}</td><td class="num">${money(line.sgstMinor)}</td>` : `<td class="num">${money(line.igstMinor)}</td>`}
      <td class="num">${money(line.totalMinor)}</td></tr>`,
    )
    .join('')
  return `<section class="invoice">
    <header>
      <div><h1>${esc(seller.storeName ?? seller.name)}</h1>${party('', { ...seller, name: seller.legalName ?? seller.name }).replace('<h3></h3>', '')}
      ${seller.email || seller.phone ? `<p class="muted">${esc([seller.phone, seller.email].filter(Boolean).join(' · '))}</p>` : ''}</div>
      <div class="meta"><h2>${credit ? 'Credit note' : 'Tax invoice'}</h2>
        <p>No. <b>${esc(invoice.number)}</b></p><p>Date ${date(invoice.issuedAt)}</p>
        ${pos.orderNumber ? `<p>Order ${esc(pos.orderNumber)}</p>` : ''}
        ${credit && pos.reason ? `<p>Reason: ${esc(pos.reason)}</p>` : ''}
        <p>Place of supply: ${esc(pos.stateName)} (${esc(pos.stateCode)})</p>
      </div>
    </header>
    <div class="parties">${party('Bill to', buyer)}${buyer.shipTo ? party('Ship to', buyer.shipTo) : ''}</div>
    <table><thead><tr><th>#</th><th>Description</th><th>HSN</th><th>Qty</th><th>Value</th><th>Discount</th><th>Taxable value</th><th>Rate</th>${taxHeads}<th>Total</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="6">Total</td><td class="num">${money(totals.taxableMinor)}</td><td></td>
      ${intra ? `<td class="num">${money(totals.cgstMinor)}</td><td class="num">${money(totals.sgstMinor)}</td>` : `<td class="num">${money(totals.igstMinor)}</td>`}
      <td class="num">${money(totals.grandTotalMinor)}</td></tr></tfoot></table>
    <div class="summary">
      <p><b>Amount in words:</b> ${esc(invoice.amountInWords)}</p>
      <p>Whether tax is payable on reverse charge: No</p>
      <p class="grand">${credit ? 'Credit' : 'Invoice'} total: ₹${money(totals.grandTotalMinor)} <span class="muted">(GST ₹${money(totals.taxMinor)})</span></p>
    </div>
    <footer>
      <p class="muted">${esc(seller.footerNote ?? '')}</p>
      <div class="sign">For ${esc(seller.legalName ?? seller.name)}
        ${seller.signatureUrl ? `<img alt="" src="${esc(seller.signatureUrl)}">` : '<div class="space"></div>'}
        <p>${esc(seller.signatory ?? 'Authorised signatory')}</p></div>
    </footer>
  </section>`
}

export function renderInvoicesHtml(invoices: readonly Invoice[], title = 'Invoice'): string {
  return `<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title><meta name="robots" content="noindex">
  <style>
    @page { size: A4; margin: 12mm }
    * { box-sizing: border-box }
    body { font: 12px/1.45 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #111; margin: 0; background: #f4f5f7 }
    .bar { position: sticky; top: 0; display: flex; gap: 8px; justify-content: flex-end; padding: 10px 16px; background: #fff; border-bottom: 1px solid #ddd }
    .bar button { font: inherit; padding: 8px 14px; border-radius: 8px; border: 1px solid #111; background: #111; color: #fff; cursor: pointer }
    .invoice { background: #fff; max-width: 210mm; margin: 16px auto; padding: 14mm; break-after: page }
    .invoice:last-child { break-after: auto }
    header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #111; padding-bottom: 10px }
    h1 { font-size: 20px; margin: 0 0 4px } h2 { font-size: 16px; margin: 0 0 6px; text-transform: uppercase; letter-spacing: .04em }
    h3 { font-size: 11px; text-transform: uppercase; color: #555; margin: 0 0 4px; letter-spacing: .04em }
    p { margin: 0 } .strong { font-weight: 700 } .muted { color: #666 } .meta { text-align: right }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 14px 0 }
    table { width: 100%; border-collapse: collapse; margin-top: 6px }
    th, td { border: 1px solid #ccc; padding: 5px 6px; vertical-align: top; text-align: left }
    th { background: #f2f3f5; font-size: 11px } .num { text-align: right; white-space: nowrap } .desc { width: 32% }
    tfoot td { font-weight: 700; background: #fafafa }
    .summary { margin-top: 12px; display: grid; gap: 4px } .grand { font-size: 15px; font-weight: 700; margin-top: 6px }
    footer { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; margin-top: 28px }
    .sign { text-align: right } .sign img { display: block; max-height: 48px; margin: 8px 0 4px auto } .space { height: 48px }
    @media print { body { background: #fff } .bar { display: none } .invoice { margin: 0; padding: 0; max-width: none } }
  </style></head><body>
  <div class="bar"><button onclick="window.print()" type="button">Print or save as PDF</button></div>
  ${invoices.map(invoiceSection).join('')}
  </body></html>`
}

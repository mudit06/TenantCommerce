// Public API of the tax-invoicing module (docs/01): numbering and GST invoices.
export { Counters } from './collections/Counters'
export { Invoices } from './collections/Invoices'
export { registerTaxInvoicingEvents } from './events'
export { nextConsecutiveNumber, nextNumber, type CounterKey } from './services/counters'
export {
  creditLines,
  financialYear,
  invoiceLinesFor,
  invoiceNumber,
  issueCreditNote,
  issueInvoice,
  totalsOf,
  type InvoiceLine,
  type InvoiceTotals,
  type PartySnapshot,
} from './services/invoices'
export { renderInvoicesHtml } from './services/render'

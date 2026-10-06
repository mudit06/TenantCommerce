// Public API of the tax-invoicing module (docs/01): numbering and GST invoices.
export { Counters } from './collections/Counters'
export { Invoices } from './collections/Invoices'
export { nextNumber, type CounterKey } from './services/counters'

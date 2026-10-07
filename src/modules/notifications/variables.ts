import { formatINR } from '@/lib/money'

// Message variables (docs/18 "Variables"): pure functions of the order, the parcel and the
// refund. Plain text only: WhatsApp rejects parameters with newlines, and a DLT variable holds at
// most 30 characters. Only the path of a link is variable, never its domain.

/** The facts a message can use, read from the order, parcel and refund at send time */
export type MessageFacts = {
  storeName: string
  storeOrigin: string
  supportPhone?: string | null
  supportEmail?: string | null
  order: {
    number: string
    customerName?: string | null
    totalMinor: number
    paymentMethod: 'razorpay' | 'cod' | string
    items: { title: string; qty: number }[]
    trackingCode: string
    codDueMinor?: number
  }
  shipment?: {
    courier?: string | null
    trackingNumber?: string | null
    trackingUrl?: string | null
    expectedDate?: string | null
    failureReason?: string | null
    codAmountMinor?: number | null
  }
  refund?: { amountMinor: number; reference?: string | null }
}

export const VARIABLE_KEYS = [
  'customer.firstName',
  'store.name',
  'order.number',
  'order.total',
  'order.itemSummary',
  'order.codDue',
  'shipment.courier',
  'shipment.trackingNumber',
  'shipment.expectedDate',
  'shipment.failureReason',
  'refund.amount',
  'refund.reference',
  'links.trackCode',
  'links.track',
  'store.help',
] as const
export type VariableKey = (typeof VARIABLE_KEYS)[number]

/** One line of plain text: no newlines or tabs, single spaces, at most `max` characters */
export function plain(value: string | null | undefined, max = 60): string {
  const text = String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim()
  if (text.length <= max) return text
  return `${text.slice(0, Math.max(1, max - 1)).trimEnd()}…`
}

export const firstName = (name: string | null | undefined) =>
  plain(String(name ?? '').split(/\s+/)[0] || 'there', 30)

/** "₹2,450", or "Rs.2,450" for SMS, which must stay GSM-7 */
export function rupees(minor: number, { sms = false } = {}): string {
  const text = formatINR(minor, { decimals: 'auto' })
  return sms ? text.replace('₹', 'Rs.') : text
}

/** "Basin mixer + 2 more", 30 characters at most */
export function itemSummary(items: { title: string; qty: number }[], max = 30): string {
  if (!items.length) return 'your items'
  const rest = items.length - 1
  const suffix = rest > 0 ? ` + ${rest} more` : items[0]!.qty > 1 ? ` × ${items[0]!.qty}` : ''
  return `${plain(items[0]!.title, Math.max(8, max - suffix.length))}${suffix}`
}

/** "Fri 9 Oct" on the Indian calendar */
export function shortDate(value: string | Date | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date
    .toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'Asia/Kolkata',
    })
    .replace(',', '')
}

const FAILURE_TEXT: Record<string, string> = {
  customer_unavailable: 'nobody was available to receive it',
  address_issue: 'the courier couldn’t find the address',
  refused: 'the parcel was refused',
  cod_not_ready: 'the cash wasn’t ready',
  other: 'the courier couldn’t deliver it',
}

export const failureText = (reason: string | null | undefined) =>
  FAILURE_TEXT[reason ?? 'other'] ?? FAILURE_TEXT.other!

/** Every variable's value for one message. `sms` keeps it GSM-7 and within DLT's 30 characters */
export function messageVariables(
  facts: MessageFacts,
  { sms = false }: { sms?: boolean } = {},
): Record<VariableKey, string> {
  const cap = sms ? 30 : 60
  const codDue = facts.order.codDueMinor ?? facts.shipment?.codAmountMinor ?? 0
  const help = [facts.supportPhone, facts.supportEmail].filter(Boolean).join(' or ')
  return {
    'customer.firstName': firstName(facts.order.customerName),
    'store.name': plain(facts.storeName, cap),
    'order.number': plain(facts.order.number, cap),
    'order.total': rupees(facts.order.totalMinor, { sms }),
    'order.itemSummary': itemSummary(facts.order.items, 30),
    'order.codDue': rupees(codDue, { sms }).replace(/^Rs\.|^₹/, ''),
    'shipment.courier': plain(facts.shipment?.courier || 'our courier', cap),
    'shipment.trackingNumber': plain(facts.shipment?.trackingNumber || 'not available yet', cap),
    'shipment.expectedDate': shortDate(facts.shipment?.expectedDate) || 'soon',
    'shipment.failureReason': plain(failureText(facts.shipment?.failureReason), cap),
    'refund.amount': rupees(facts.refund?.amountMinor ?? 0, { sms }),
    'refund.reference': plain(facts.refund?.reference || 'shown in your bank statement', cap),
    'links.trackCode': facts.order.trackingCode,
    'links.track': `${facts.storeOrigin.replace(/\/$/, '')}/t/${facts.order.trackingCode}`,
    'store.help': plain(help || facts.storeName, 80),
  }
}

/** Fills `{{1}}`, `{{2}}`… (WhatsApp) with the variables in template order */
export function fillNumbered(body: string, values: string[]): string {
  return body.replace(/\{\{(\d+)\}\}/g, (_, n: string) => values[Number(n) - 1] ?? '')
}

/** Fills `{customer.firstName}`-style placeholders (email copy) */
export function fillNamed(text: string, values: Record<string, string>): string {
  return text.replace(/\{([a-zA-Z]+\.[a-zA-Z]+)\}/g, (match, key: string) => values[key] ?? match)
}

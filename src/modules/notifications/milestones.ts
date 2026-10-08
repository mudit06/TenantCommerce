// The order journey steps shoppers are told about (docs/18 "Order journey milestones"). Fixed in
// code so templates, reports and the Shiprocket status map stay consistent: vendors choose the
// channels for each step, never new steps.

export const CHANNELS = ['email', 'whatsapp', 'sms'] as const
export type Channel = (typeof CHANNELS)[number]

export const CHANNEL_LABELS: Record<Channel, string> = {
  email: 'Email',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
}

/** `fallback` (SMS only) sends when WhatsApp can't reach the shopper */
export type ChannelMode = 'on' | 'off' | 'fallback'

export type MilestoneDefinition = {
  key: string
  label: string
  /** One line under the step name on the Order updates screen */
  description: string
  defaults: { email: 'on' | 'off'; whatsapp: 'on' | 'off'; sms: ChannelMode }
  /** Prepaid and COD wording differ: an approved WhatsApp template can't switch sentences */
  variants: readonly ('default' | 'prepaid' | 'cod')[]
  /** Goes out during quiet hours: missing it means a failed delivery */
  urgent?: boolean
  /** Built in a later milestone (returns): listed, but nothing fires it yet */
  later?: boolean
}

export const MILESTONES = [
  {
    key: 'order_confirmed',
    label: 'Order confirmed',
    description: 'Prepaid and COD versions',
    defaults: { email: 'on', whatsapp: 'on', sms: 'fallback' },
    variants: ['prepaid', 'cod'],
  },
  {
    key: 'shipment_packed',
    label: 'Packed',
    description: 'Sent a little later, unless it ships first',
    defaults: { email: 'off', whatsapp: 'on', sms: 'off' },
    variants: ['default'],
  },
  {
    key: 'shipment_shipped',
    label: 'Shipped',
    description: 'Courier, tracking number, date',
    defaults: { email: 'on', whatsapp: 'on', sms: 'fallback' },
    variants: ['default'],
  },
  {
    key: 'shipment_in_transit',
    label: 'In transit',
    description: 'Off: too many messages',
    defaults: { email: 'off', whatsapp: 'off', sms: 'off' },
    variants: ['default'],
  },
  {
    key: 'shipment_out_for_delivery',
    label: 'Out for delivery',
    description: 'Includes the COD amount to keep ready',
    defaults: { email: 'off', whatsapp: 'on', sms: 'on' },
    variants: ['prepaid', 'cod'],
    urgent: true,
  },
  {
    key: 'shipment_delivery_failed',
    label: 'Delivery failed',
    description: 'Why, and what happens next',
    defaults: { email: 'on', whatsapp: 'on', sms: 'fallback' },
    variants: ['default'],
    urgent: true,
  },
  {
    key: 'shipment_delivered',
    label: 'Delivered',
    description: 'Invoice and return window',
    defaults: { email: 'on', whatsapp: 'on', sms: 'off' },
    variants: ['default'],
  },
  {
    key: 'order_cancelled',
    label: 'Order cancelled',
    description: 'Refund note when prepaid',
    defaults: { email: 'on', whatsapp: 'on', sms: 'fallback' },
    variants: ['prepaid', 'cod'],
  },
  {
    key: 'refund_processed',
    label: 'Refund processed',
    description: 'Amount and reference',
    defaults: { email: 'on', whatsapp: 'on', sms: 'fallback' },
    variants: ['default'],
  },
  {
    key: 'return_approved',
    label: 'Return approved',
    description: 'Pickup instructions',
    defaults: { email: 'on', whatsapp: 'on', sms: 'off' },
    variants: ['default'],
  },
  {
    key: 'return_rejected',
    label: 'Return rejected',
    description: 'Reason and help contact',
    defaults: { email: 'on', whatsapp: 'on', sms: 'off' },
    variants: ['default'],
  },
] as const satisfies readonly MilestoneDefinition[]

export type MilestoneKey = (typeof MILESTONES)[number]['key']

export const MILESTONE_KEYS = MILESTONES.map((m) => m.key) as [MilestoneKey, ...MilestoneKey[]]

export const isMilestoneKey = (value: string): value is MilestoneKey =>
  (MILESTONE_KEYS as readonly string[]).includes(value)

export function milestoneOf(key: string): MilestoneDefinition {
  const found = MILESTONES.find((m) => m.key === key)
  if (!found) throw new Error(`Unknown milestone "${key}"`)
  return found
}

/** The parcel status that fires each shipment milestone (docs/11 parcel journey) */
export const MILESTONE_FOR_PARCEL: Record<string, MilestoneKey> = {
  packed: 'shipment_packed',
  shipped: 'shipment_shipped',
  in_transit: 'shipment_in_transit',
  out_for_delivery: 'shipment_out_for_delivery',
  delivery_failed: 'shipment_delivery_failed',
  delivered: 'shipment_delivered',
}

/** How far along the parcel journey a status is, for the stale check at send time */
export const PARCEL_STEP: Record<string, number> = {
  packed: 1,
  shipped: 2,
  in_transit: 3,
  out_for_delivery: 4,
  delivery_failed: 4,
  delivered: 5,
  rto_initiated: 6,
  rto_delivered: 7,
  lost: 7,
  cancelled: 8,
}

export const SKIP_REASONS = [
  { value: 'opted_out', label: 'The shopper stopped these updates' },
  { value: 'no_whatsapp_opt_in', label: 'No WhatsApp opt-in at checkout' },
  { value: 'no_offer_consent', label: 'No consent for offers' },
  { value: 'channel_off', label: 'Switched off for this step' },
  { value: 'not_connected', label: 'WhatsApp isn’t connected' },
  { value: 'template_not_approved', label: 'Template not approved by Meta yet' },
  { value: 'cap_reached', label: 'Daily limit for this shopper reached' },
  { value: 'frequency_cap', label: 'Weekly offer limit reached' },
  { value: 'no_phone', label: 'No mobile number on the order' },
  { value: 'no_email', label: 'No email on the order' },
  { value: 'stale', label: 'Out of date by the time it was due' },
] as const
export type SkipReason = (typeof SKIP_REASONS)[number]['value']

export const LOG_STATUSES = [
  { value: 'queued', label: 'Queued' },
  { value: 'sent', label: 'Sent' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'read', label: 'Read' },
  { value: 'clicked', label: 'Clicked' },
  { value: 'failed', label: 'Failed' },
  { value: 'skipped', label: 'Not sent' },
  { value: 'received', label: 'Received' },
] as const
export type LogStatus = (typeof LOG_STATUSES)[number]['value']

export const TEMPLATE_STATUSES = [
  { value: 'draft', label: 'Not submitted' },
  { value: 'submitted', label: 'Waiting for Meta' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'paused', label: 'Paused by Meta' },
  { value: 'disabled', label: 'Disabled' },
] as const
export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number]['value']

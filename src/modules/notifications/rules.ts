import type { Channel, MilestoneDefinition, SkipReason } from './milestones'

// The engine's decisions as pure functions (docs/18 "Rules"), so they are unit tested without a
// database: dedupe keys, phone numbers, quiet hours and the packed delay, and which channel sends.

/** `<milestone>:<order|shipment|refund id>:<attempt>:<channel>`, unique per store */
export const dedupeKey = (
  milestone: string,
  subjectId: string,
  attempt: number,
  channel: Channel,
) => `${milestone}:${subjectId}:${attempt}:${channel}`

/** Indian mobiles only in MVP: +91 and 10 digits starting 6 to 9 (docs/18 "Phone numbers") */
export function indianMobile(value: string | null | undefined): string | null {
  const digits = String(value ?? '').replace(/[^\d]/g, '')
  const local = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits
  const ten = local.length === 11 && local.startsWith('0') ? local.slice(1) : local
  return /^[6-9]\d{9}$/.test(ten) ? `+91${ten}` : null
}

/** "+91 98xxx xx210": enough for the shopper to recognise their number, not to copy it */
export function maskedPhone(e164: string | null | undefined): string {
  if (!e164) return ''
  const ten = e164.replace(/^\+91/, '')
  if (ten.length !== 10) return e164
  return `+91 ${ten.slice(0, 2)}xxx xx${ten.slice(7)}`
}

const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

/** Minutes past midnight in the store's time zone */
export function localMinutes(now: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  return get('hour') * 60 + get('minute')
}

export type Timing = {
  packedDelayMinutes: number
  quietHours: { enabled: boolean; start: string; end: string }
  timeZone: string
}

/**
 * When a message may go out: the packed message waits (and is dropped if the parcel ships
 * first); messages created in quiet hours wait until they end, except urgent steps.
 */
export function sendAfterFor(
  now: Date,
  milestone: Pick<MilestoneDefinition, 'key' | 'urgent'>,
  timing: Timing,
): Date {
  let at = now
  if (milestone.key === 'shipment_packed' && timing.packedDelayMinutes > 0) {
    at = new Date(at.getTime() + timing.packedDelayMinutes * 60_000)
  }
  if (milestone.urgent || !timing.quietHours.enabled) return at
  const start = minutesOf(timing.quietHours.start)
  const end = minutesOf(timing.quietHours.end)
  if (start === end) return at
  const local = localMinutes(at, timing.timeZone)
  const inside = start < end ? local >= start && local < end : local >= start || local < end
  if (!inside) return at
  const wait = (end - local + 1440) % 1440
  const target = new Date(at.getTime() + wait * 60_000)
  target.setUTCSeconds(0, 0)
  return target
}

export type ChannelPlan =
  | { channel: Channel; send: true; provider: 'resend' | 'meta' | 'dev-log' }
  | { channel: Channel; send: false; reason: SkipReason }

export type DecisionInput = {
  modes: { email: 'on' | 'off'; whatsapp: 'on' | 'off' }
  email: string | null
  phone: string | null
  /** Ticked at checkout and not stopped since */
  whatsappOptIn: boolean
  whatsappOptedOut: boolean
  /** Meta connected; or none, where local and staging print to the log instead */
  whatsappProvider: 'meta' | 'dev-log' | null
  templateApproved: boolean
  /** Messages already queued or sent to this recipient today */
  sentToday: { email: number; phone: number }
  perRecipientPerDay: number
}

/**
 * Which channels send for one step (docs/18). Channels switched off for the step plan nothing:
 * there is nothing to show the team. Every other skip is logged with its reason. SMS waits for
 * the MSG91 connector (mudit, 6 October 2026), so it plans nothing yet.
 */
export function decideChannels(input: DecisionInput): ChannelPlan[] {
  const plans: ChannelPlan[] = []
  if (input.modes.email === 'on') {
    if (!input.email) plans.push({ channel: 'email', send: false, reason: 'no_email' })
    else if (input.sentToday.email >= input.perRecipientPerDay)
      plans.push({ channel: 'email', send: false, reason: 'cap_reached' })
    else plans.push({ channel: 'email', send: true, provider: 'resend' })
  }
  if (input.modes.whatsapp === 'on') {
    const skip = (reason: SkipReason) => plans.push({ channel: 'whatsapp', send: false, reason })
    if (!input.phone) skip('no_phone')
    else if (input.whatsappOptedOut) skip('opted_out')
    else if (!input.whatsappOptIn) skip('no_whatsapp_opt_in')
    else if (!input.whatsappProvider) skip('not_connected')
    else if (input.whatsappProvider === 'meta' && !input.templateApproved)
      skip('template_not_approved')
    else if (input.sentToday.phone >= input.perRecipientPerDay) skip('cap_reached')
    else plans.push({ channel: 'whatsapp', send: true, provider: input.whatsappProvider })
  }
  return plans
}

/** Which wording an order gets: prepaid and COD versions where the step has them */
export function variantFor(
  milestone: Pick<MilestoneDefinition, 'variants'>,
  paymentMethod: string,
): 'default' | 'prepaid' | 'cod' {
  if (milestone.variants.includes('default' as never)) return 'default'
  return paymentMethod === 'cod' ? 'cod' : 'prepaid'
}

/** A newer status from Meta replaces an older one, never the other way round */
const RANK: Record<string, number> = { queued: 0, sent: 1, delivered: 2, read: 3, failed: 4 }
export const isNewerStatus = (current: string, incoming: string) =>
  incoming === 'failed' ? current !== 'read' : (RANK[incoming] ?? 0) > (RANK[current] ?? 0)

/** STOP and START replies (docs/18 "Opt-out") */
export function replyIntent(text: string): 'stop' | 'stop-offers' | 'start' | null {
  const word = text
    .trim()
    .toLowerCase()
    .replace(/[.!]+$/, '')
  // The "Stop offers" button on marketing templates, or the words
  if (['stop offers', 'stop promotions', 'no offers'].includes(word)) return 'stop-offers'
  if (['stop', 'stop updates', 'unsubscribe', 'band karo', 'band'].includes(word)) return 'stop'
  if (['start', 'start updates', 'resume'].includes(word)) return 'start'
  return null
}

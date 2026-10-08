import { describe, expect, it } from 'vitest'

import { MILESTONES } from '@/modules/notifications/milestones'
import { renderEmail, renderWhatsApp, sampleFacts } from '@/modules/notifications/render'
import {
  decideChannels,
  dedupeKey,
  indianMobile,
  isNewerStatus,
  maskedPhone,
  replyIntent,
  sendAfterFor,
  variantFor,
  type DecisionInput,
} from '@/modules/notifications/rules'
import { STARTER_TEMPLATES } from '@/modules/notifications/starter-templates'
import { itemSummary, messageVariables, plain, shortDate } from '@/modules/notifications/variables'

// Order updates (docs/18 "Testing"): variables and length limits, dedupe keys, channel
// decisions, quiet hours and the packed delay, and the starter library's Meta rules.

const store = {
  storeName: 'Home Orbit',
  storeOrigin: 'https://homeorbit.example',
  supportPhone: '+91 90000 00001',
  supportEmail: 'care@homeorbit.example',
  orderPrefix: 'HOR',
}

describe('variables', () => {
  it('keeps every value on one line and short', () => {
    expect(plain('Basin\nmixer\t  matt   black')).toBe('Basin mixer matt black')
    expect(plain('x'.repeat(80), 30)).toHaveLength(30)
    expect(
      itemSummary([
        { title: 'Aria single-lever basin mixer', qty: 1 },
        { title: 'WC', qty: 1 },
      ]),
    ).toBe('Aria single-lever ba… + 1 more')
    expect(itemSummary([{ title: 'Towel ring', qty: 3 }])).toBe('Towel ring × 3')
    expect(itemSummary([])).toBe('your items')
  })

  it('writes dates and money as shoppers read them, and Rs. for SMS', () => {
    expect(shortDate('2026-10-09T06:00:00Z')).toBe('Fri 9 Oct')
    const facts = sampleFacts(store, 'cod')
    const wa = messageVariables(facts)
    expect(wa['order.total']).toBe('₹23,640')
    expect(wa['order.codDue']).toBe('23,640')
    expect(wa['links.track']).toBe('https://homeorbit.example/t/K7Q2M9XW4P')
    const sms = messageVariables(facts, { sms: true })
    expect(sms['order.total']).toBe('Rs.23,640')
    for (const value of Object.values(sms)) {
      if (!value.startsWith('https://')) expect(value.length).toBeLessThanOrEqual(80)
      expect(value).not.toMatch(/\n/)
    }
    // A return's pickup instructions and rejection reason, on one line
    const ret = messageVariables({
      ...facts,
      return: { instructions: 'Courier picks it up Friday.\nKeep the box.', reason: null },
    })
    expect(ret['return.instructions']).toBe('Courier picks it up Friday. Keep the box.')
    expect(ret['return.reason']).toBe('it doesn’t meet the return policy')
  })
})

describe('starter templates', () => {
  it('has wording for every step and variant, passing Meta’s utility rules', () => {
    for (const milestone of MILESTONES) {
      for (const variant of milestone.variants) {
        const starter = STARTER_TEMPLATES[milestone.key][variant]
        expect(starter, `${milestone.key}:${variant}`).toBeTruthy()
        const body = starter!.whatsapp.body
        // Never starts or ends with a variable; variables numbered 1..n in order
        expect(body.trim()).not.toMatch(/^\{\{|\}\}$/)
        const numbers = [...body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]))
        expect(numbers).toEqual(numbers.map((_, i) => i + 1))
        expect(starter!.whatsapp.variables).toHaveLength(numbers.length)
        // Utility: order facts only, no offers
        expect(body.toLowerCase()).not.toMatch(/offer|discount|sale|coupon|% off/)
      }
    }
  })

  it('renders the shipped message with the store’s name and the track button', () => {
    const message = renderWhatsApp('shipment_shipped', 'default', sampleFacts(store, 'default'))
    expect(message.text).toContain(
      'Hi Rahul, your Home Orbit order HOR-10482 has shipped with Delhivery.',
    )
    expect(message.text).toContain('Tracking number: 1490 2210 0458')
    expect(message.buttonParam).toBe('K7Q2M9XW4P')
    expect(message.bodyParams).toHaveLength(5)
    const email = renderEmail('order_confirmed', 'cod', sampleFacts(store, 'cod'))
    expect(email.subject).toBe('Order HOR-10482 confirmed')
    expect(email.text).toContain('Please keep ₹23,640 ready to pay in cash')
    expect(email.html).toContain('href="https://homeorbit.example/t/K7Q2M9XW4P"')
  })
})

describe('rules', () => {
  it('builds one dedupe key per step, parcel, attempt and channel', () => {
    expect(dedupeKey('shipment_shipped', 's1', 0, 'whatsapp')).toBe(
      'shipment_shipped:s1:0:whatsapp',
    )
    expect(dedupeKey('shipment_delivery_failed', 's1', 2, 'email')).not.toBe(
      dedupeKey('shipment_delivery_failed', 's1', 1, 'email'),
    )
  })

  it('takes Indian mobiles only, stored as +91', () => {
    expect(indianMobile('98765 43210')).toBe('+919876543210')
    expect(indianMobile('+91-98765-43210')).toBe('+919876543210')
    expect(indianMobile('098765 43210')).toBe('+919876543210')
    expect(indianMobile('919876543210')).toBe('+919876543210')
    expect(indianMobile('5876543210')).toBeNull()
    expect(indianMobile('+1 415 555 0100')).toBeNull()
    expect(maskedPhone('+919876543210')).toBe('+91 98xxx xx210')
  })

  const timing = {
    packedDelayMinutes: 15,
    quietHours: { enabled: true, start: '21:00', end: '09:00' },
    timeZone: 'Asia/Kolkata',
  }
  const at = (iso: string) => new Date(iso)

  it('holds messages created in quiet hours until 09:00, except urgent steps', () => {
    // 22:30 IST = 17:00 UTC
    const night = at('2026-10-07T17:00:00Z')
    expect(sendAfterFor(night, { key: 'shipment_shipped' }, timing).toISOString()).toBe(
      '2026-10-08T03:30:00.000Z', // 09:00 IST
    )
    expect(sendAfterFor(night, { key: 'shipment_out_for_delivery', urgent: true }, timing)).toEqual(
      night,
    )
    // 14:00 IST: straight away
    const day = at('2026-10-07T08:30:00Z')
    expect(sendAfterFor(day, { key: 'shipment_shipped' }, timing)).toEqual(day)
    // Switched off: straight away
    expect(
      sendAfterFor(
        night,
        { key: 'shipment_shipped' },
        { ...timing, quietHours: { ...timing.quietHours, enabled: false } },
      ),
    ).toEqual(night)
  })

  it('waits 15 minutes before the packed message', () => {
    const day = at('2026-10-07T08:30:00Z')
    expect(sendAfterFor(day, { key: 'shipment_packed' }, timing).toISOString()).toBe(
      '2026-10-07T08:45:00.000Z',
    )
  })

  const input = (overrides: Partial<DecisionInput> = {}): DecisionInput => ({
    modes: { email: 'on', whatsapp: 'on' },
    email: 'rahul@example.com',
    phone: '+919876543210',
    whatsappOptIn: true,
    whatsappOptedOut: false,
    whatsappProvider: 'meta',
    templateApproved: true,
    sentToday: { email: 0, phone: 0 },
    perRecipientPerDay: 10,
    ...overrides,
  })

  it('sends on each channel switched on, and says why when it can’t', () => {
    expect(decideChannels(input())).toEqual([
      { channel: 'email', send: true, provider: 'resend' },
      { channel: 'whatsapp', send: true, provider: 'meta' },
    ])
    const reason = (overrides: Partial<DecisionInput>) =>
      decideChannels(input(overrides)).find((p) => p.channel === 'whatsapp')
    expect(reason({ whatsappOptedOut: true })).toMatchObject({ send: false, reason: 'opted_out' })
    expect(reason({ whatsappOptIn: false })).toMatchObject({ reason: 'no_whatsapp_opt_in' })
    expect(reason({ templateApproved: false })).toMatchObject({ reason: 'template_not_approved' })
    expect(reason({ whatsappProvider: null })).toMatchObject({ reason: 'not_connected' })
    expect(reason({ phone: null })).toMatchObject({ reason: 'no_phone' })
    expect(reason({ sentToday: { email: 0, phone: 10 } })).toMatchObject({ reason: 'cap_reached' })
    // The dev log needs no approved template
    expect(reason({ whatsappProvider: 'dev-log', templateApproved: false })).toMatchObject({
      send: true,
      provider: 'dev-log',
    })
    // A channel switched off for the step plans nothing at all
    expect(decideChannels(input({ modes: { email: 'off', whatsapp: 'off' } }))).toEqual([])
  })

  it('picks prepaid or COD wording where a step has both', () => {
    expect(variantFor({ variants: ['prepaid', 'cod'] }, 'cod')).toBe('cod')
    expect(variantFor({ variants: ['prepaid', 'cod'] }, 'razorpay')).toBe('prepaid')
    expect(variantFor({ variants: ['default'] }, 'cod')).toBe('default')
  })

  it('only moves a receipt forward, and reads STOP and START', () => {
    expect(isNewerStatus('sent', 'delivered')).toBe(true)
    expect(isNewerStatus('read', 'delivered')).toBe(false)
    expect(isNewerStatus('delivered', 'failed')).toBe(true)
    expect(isNewerStatus('read', 'failed')).toBe(false)
    expect(replyIntent(' STOP ')).toBe('stop')
    expect(replyIntent('Start.')).toBe('start')
    expect(replyIntent('Stop offers')).toBe('stop-offers')
    expect(replyIntent('where is my order?')).toBeNull()
  })
})

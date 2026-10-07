import { createHmac } from 'node:crypto'

import type { Payload, Where } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { saveConnector } from '@/connectors'
import { withTransaction } from '@/lib/db/transaction'
import { saveCodRules } from '@/modules/content'
import { setTrackingUpdates, trackingView } from '@/modules/notifications'
import { queueMilestone } from '@/modules/notifications/services/engine'
import { resendMessage, sendTest } from '@/modules/notifications/services/messages'
import { sendLog } from '@/modules/notifications/services/send'
import { saveSettings } from '@/modules/notifications/services/settings'
import { submitTemplates, syncTemplates } from '@/modules/notifications/services/templates'
import { handleWhatsAppWebhook } from '@/modules/notifications/services/webhook'
import { moveParcel, packParcel, placeOrder, placeOrderSchema } from '@/modules/orders'
import type { NotificationLog, Order, Plan } from '@/payload-types'

import {
  createPlatformUser,
  inStoreSession,
  reqAs,
  seedPlans,
  startPayload,
  stopPayload,
  type TestUser,
} from './helpers'
import { buildShop, sampleOrderInput, type Shop } from './shop'

// Order updates (docs/18 "Testing"): each step logs once per channel, the dedupe key stops
// repeats, opt-out and unapproved templates skip with a reason, WhatsApp goes through Meta with
// the approved template, receipts move a message forward, STOP works, and one store's webhook
// can't touch another store's messages.

let payload: Payload
let plans: Record<string, Plan>
let admin: TestUser
let shopA: Shop
let shopB: Shop

const APP_SECRET = 'meta-app-secret-a'

/** A stand-in for Meta's Graph API: records calls and approves every template it is asked about */
function fakeMeta() {
  const calls: { url: string; body: Record<string, unknown> | null }[] = []
  let sent = 0
  const fetchImpl = (async (url: string, init?: RequestInit) => {
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null
    calls.push({ url: String(url), body })
    const json = (data: unknown) =>
      new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    if (String(url).includes('/message_templates') && init?.method === 'POST')
      return json({ id: `tpl_${calls.length}`, status: 'PENDING', category: 'UTILITY' })
    if (String(url).includes('/message_templates')) {
      const names = calls
        .filter((c) => c.url.includes('/message_templates') && c.body)
        .map((c) => c.body!.name as string)
      return json({
        data: names.map((name, i) => ({
          id: `tpl_${i}`,
          name,
          language: 'en',
          status: 'APPROVED',
        })),
      })
    }
    if (String(url).endsWith('/messages')) return json({ messages: [{ id: `wamid.${++sent}` }] })
    return new Response('{}', { status: 404 })
  }) as typeof fetch
  return { fetchImpl, calls }
}

const logsOf = async (orderId: string | number, extra: Where = {}) =>
  (
    await payload.find({
      collection: 'notification-logs',
      where: { and: [{ order: { equals: orderId } }, extra] },
      sort: 'createdAt',
      pagination: false,
      overrideAccess: true,
    })
  ).docs

async function placeCod(shop: Shop, overrides: Record<string, unknown> = {}): Promise<Order> {
  const req = await reqAs(payload)
  const input = placeOrderSchema.parse(sampleOrderInput({ paymentMethod: 'cod', ...overrides }))
  return (
    await withTransaction(req, () =>
      placeOrder(req, shop.tenantId, {
        lines: [{ productId: shop.towel, qty: 1 }],
        input,
        live: null,
      }),
    )
  ).order
}

const asOwner = async <T>(
  shop: Shop,
  fn: (req: Awaited<ReturnType<typeof reqAs>>) => Promise<T>,
) => {
  const req = await reqAs(payload, shop.owner)
  return withTransaction(req, () => fn(req))
}

const signed = (body: unknown, secret = APP_SECRET) => {
  const rawBody = JSON.stringify(body)
  return {
    rawBody,
    signature: `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`,
  }
}

beforeAll(async () => {
  payload = await startPayload()
  plans = await seedPlans(payload)
  admin = await createPlatformUser(payload, 'admin@platform.test', 'super-admin')
  shopA = await buildShop(payload, {
    admin,
    plan: plans.starter!,
    slug: 'note-a',
    ownerEmail: 'a@note.test',
  })
  shopB = await buildShop(payload, {
    admin,
    plan: plans.starter!,
    slug: 'note-b',
    ownerEmail: 'b@note.test',
  })
  for (const shop of [shopA, shopB]) {
    await asOwner(shop, (req) =>
      saveCodRules(req, {
        tenantId: shop.tenantId,
        codEnabled: true,
        codMinOrderMinor: null,
        codMaxOrderMinor: null,
        codFeeMinor: null,
      }),
    )
  }
})

afterAll(async () => {
  await stopPayload(payload)
})

describe('order updates without WhatsApp connected', () => {
  let order: Order

  it('creates the store’s settings and starter templates when the store is made', async () => {
    const { docs: settings } = await payload.find({
      collection: 'notification-settings',
      where: { tenant: { equals: shopA.tenantId } },
      overrideAccess: true,
    })
    expect(settings).toHaveLength(1)
    const { totalDocs } = await payload.count({
      collection: 'notification-templates',
      where: { and: [{ tenant: { equals: shopA.tenantId } }, { status: { equals: 'draft' } }] },
      overrideAccess: true,
    })
    expect(totalDocs).toBeGreaterThanOrEqual(11)
  })

  it('confirms a COD order by email and WhatsApp (dev log), once', async () => {
    order = await placeCod(shopA)
    const logs = await logsOf(order.id)
    expect(logs.map((l) => [l.milestone, l.channel, l.status, l.provider, l.variant])).toEqual([
      ['order_confirmed', 'email', 'queued', 'resend', 'cod'],
      ['order_confirmed', 'whatsapp', 'queued', 'dev-log', 'cod'],
    ])
    expect(logs[1]!.to).toBe('+919876543210')
    // The checkout box is remembered by phone
    const { docs: prefs } = await payload.find({
      collection: 'contact-preferences',
      where: { tenant: { equals: shopA.tenantId } },
      overrideAccess: true,
    })
    expect(prefs[0]).toMatchObject({ type: 'phone', value: '+919876543210' })
    expect(prefs[0]!.whatsapp?.optedIn).toBe(true)
    // A job per message
    const { totalDocs: jobs } = await payload.count({
      collection: 'payload-jobs',
      where: { taskSlug: { equals: 'notifications-send' } },
      overrideAccess: true,
    })
    expect(jobs).toBeGreaterThanOrEqual(2)

    // The same step again sends nothing new
    const req = await reqAs(payload)
    await withTransaction(req, () =>
      queueMilestone(req, {
        tenantId: shopA.tenantId,
        orderId: String(order.id),
        milestone: 'order_confirmed',
      }),
    )
    expect(await logsOf(order.id)).toHaveLength(2)

    for (const log of logs) expect(await sendLog(payload, String(log.id))).toBe('sent')
    const sent = await logsOf(order.id)
    expect(sent.map((l) => l.status)).toEqual(['sent', 'sent'])
    expect(sent[0]!.preview).toMatch(/^Order NOT-\d+ confirmed$/)
    expect(sent[1]!.preview).toContain('Please keep ₹')
    expect(sent[1]!.preview).toContain(order.orderNumber)
    // Running the job twice sends once
    expect(await sendLog(payload, String(logs[0]!.id))).toBe('not-queued')
  })

  it('drops the packed message when the parcel ships first, and sends the shipped one', async () => {
    const parcel = await asOwner(shopA, (req) => packParcel(req, String(order.id)))
    const packed = await logsOf(order.id, { milestone: { equals: 'shipment_packed' } })
    expect(packed).toHaveLength(1) // WhatsApp only by default
    expect(new Date(packed[0]!.sendAfter!).getTime()).toBeGreaterThan(Date.now() + 10 * 60_000)
    await asOwner(shopA, (req) =>
      moveParcel(req, String(parcel.id), {
        to: 'shipped',
        carrier: 'Delhivery',
        trackingNumber: 'AWB123',
      }),
    )
    expect(await sendLog(payload, String(packed[0]!.id))).toBe('skipped')
    expect((await logsOf(order.id, { milestone: { equals: 'shipment_packed' } }))[0]).toMatchObject(
      {
        status: 'skipped',
        skipReason: 'stale',
      },
    )
    const shipped = await logsOf(order.id, { milestone: { equals: 'shipment_shipped' } })
    expect(shipped.map((l) => l.channel).sort()).toEqual(['email', 'whatsapp'])
    const wa = shipped.find((l) => l.channel === 'whatsapp')!
    expect(await sendLog(payload, String(wa.id))).toBe('sent')
    const after = await payload.findByID({
      collection: 'notification-logs',
      id: wa.id,
      overrideAccess: true,
    })
    expect(after.preview).toContain('has shipped with Delhivery')
    expect(after.preview).toContain('Tracking number: AWB123')
  })

  it('shows the journey on the tracking page and stops WhatsApp from there', async () => {
    const view = await trackingView(payload, shopA.tenantId, order.trackingCode)
    expect(view).toMatchObject({
      orderNumber: order.orderNumber,
      phone: '+91 98xxx xx210',
      whatsappOn: true,
    })
    expect(view!.steps.map((s) => [s.label.split(' ')[0], s.done])).toEqual([
      ['Placed', true],
      ['Confirmed', true],
      ['Packed', true],
      ['Shipped', true],
      ['Delivered', false],
    ])
    expect(view!.parcels[0]).toMatchObject({ courier: 'Delhivery', trackingNumber: 'AWB123' })
    // Another store's code, or a guessed one, shows nothing
    expect(await trackingView(payload, shopB.tenantId, order.trackingCode)).toBeNull()
    expect(await trackingView(payload, shopA.tenantId, 'AAAAAAAAAA')).toBeNull()

    const req = await reqAs(payload)
    await withTransaction(req, () =>
      setTrackingUpdates(req, shopA.tenantId, order.trackingCode, false),
    )
    expect((await trackingView(payload, shopA.tenantId, order.trackingCode))!.whatsappOn).toBe(
      false,
    )

    const parcel = (
      await payload.find({
        collection: 'shipments',
        where: { order: { equals: order.id } },
        overrideAccess: true,
      })
    ).docs[0]!
    await asOwner(shopA, (req) => moveParcel(req, String(parcel.id), { to: 'out_for_delivery' }))
    const ofd = await logsOf(order.id, { milestone: { equals: 'shipment_out_for_delivery' } })
    expect(ofd).toHaveLength(1)
    expect(ofd[0]).toMatchObject({
      channel: 'whatsapp',
      status: 'skipped',
      skipReason: 'opted_out',
    })
  })

  it('skips WhatsApp for a shopper who didn’t tick the box', async () => {
    const other = await placeCod(shopA, {
      whatsappOptIn: false,
      contact: { name: 'Meera Shah', email: 'meera@example.com', phone: '91234 56789' },
      shippingAddress: { ...sampleOrderInput().shippingAddress, phone: '91234 56789' },
    })
    const logs = await logsOf(other.id)
    expect(logs.find((l) => l.channel === 'whatsapp')).toMatchObject({
      status: 'skipped',
      skipReason: 'no_whatsapp_opt_in',
    })
  })
})

describe('order updates through the store’s own WhatsApp', () => {
  const meta = fakeMeta()
  let order: Order

  beforeAll(async () => {
    await saveConnector(await reqAs(payload, shopA.owner), 'meta-whatsapp', {
      tenantId: shopA.tenantId,
      public: { phoneNumberId: '1093000004471', wabaId: '2287000001190' },
      secrets: { accessToken: 'EAAG-test-token', appSecret: APP_SECRET },
    })
  })

  it('skips WhatsApp until Meta approves the template, then sends the approved one', async () => {
    order = await placeCod(shopA, {
      contact: { name: 'Arjun Rao', email: 'arjun@example.com', phone: '99887 76655' },
      shippingAddress: { ...sampleOrderInput().shippingAddress, phone: '99887 76655' },
    })
    expect((await logsOf(order.id)).find((l) => l.channel === 'whatsapp')).toMatchObject({
      status: 'skipped',
      skipReason: 'template_not_approved',
    })

    const ownerReq = await reqAs(payload, shopA.owner)
    const submitted = await submitTemplates(ownerReq, shopA.tenantId, { fetchImpl: meta.fetchImpl })
    expect(submitted.submitted).toBeGreaterThanOrEqual(11)
    const create = meta.calls.find((c) => c.body?.name === 'shipment_shipped')!
    expect(create.body).toMatchObject({ category: 'UTILITY', language: 'en' })
    expect(JSON.stringify(create.body)).toContain('/t/{{1}}')
    const synced = await syncTemplates(ownerReq, shopA.tenantId, { fetchImpl: meta.fetchImpl })
    expect(synced.updated).toBeGreaterThanOrEqual(11)

    const parcel = await asOwner(shopA, (req) => packParcel(req, String(order.id)))
    await asOwner(shopA, (req) =>
      moveParcel(req, String(parcel.id), {
        to: 'shipped',
        carrier: 'Blue Dart',
        trackingNumber: 'BD99',
      }),
    )
    const wa = (await logsOf(order.id, { milestone: { equals: 'shipment_shipped' } })).find(
      (l) => l.channel === 'whatsapp',
    )!
    expect(wa).toMatchObject({ status: 'queued', provider: 'meta' })
    expect(await sendLog(payload, String(wa.id), { fetchImpl: meta.fetchImpl })).toBe('sent')
    const send = meta.calls.at(-1)!
    expect(send.url).toContain('/1093000004471/messages')
    expect(send.body).toMatchObject({
      to: '919988776655',
      type: 'template',
      template: { name: 'shipment_shipped', language: { code: 'en' } },
    })
    const params = (send.body!.template as { components: { parameters: { text: string }[] }[] })
      .components
    expect(params[0]!.parameters.map((p) => p.text)).toEqual([
      'Arjun',
      order.orderNumber,
      'Blue Dart',
      'BD99',
      expect.any(String),
    ])
    expect(params[1]!.parameters[0]!.text).toBe(order.trackingCode)
  })

  it('moves a message forward on Meta’s receipts, never back, and ignores bad signatures', async () => {
    const wa = (await logsOf(order.id, { milestone: { equals: 'shipment_shipped' } })).find(
      (l) => l.channel === 'whatsapp',
    )!
    const receipt = (status: string) => ({
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: { statuses: [{ id: wa.providerMessageId, status, timestamp: '1791000000' }] },
            },
          ],
        },
      ],
    })
    const run = async (body: ReturnType<typeof signed>, tenantId = shopA.tenantId) => {
      const req = await reqAs(payload)
      return withTransaction(req, () => handleWhatsAppWebhook(req, tenantId, body))
    }
    expect(await run(signed(receipt('read')))).toBe('processed')
    expect(await run(signed(receipt('delivered')))).toBe('processed')
    let now = await payload.findByID({
      collection: 'notification-logs',
      id: wa.id,
      overrideAccess: true,
    })
    expect(now.status).toBe('read')
    expect(now.readAt).toBeTruthy()
    expect(now.deliveredAt).toBeTruthy()

    expect(await run(signed(receipt('failed'), 'wrong-secret'))).toBe('bad-signature')
    now = await payload.findByID({
      collection: 'notification-logs',
      id: wa.id,
      overrideAccess: true,
    })
    expect(now.status).toBe('read')

    // Store B, with its own WhatsApp, can't touch store A's message even with its id
    await saveConnector(await reqAs(payload, shopB.owner), 'meta-whatsapp', {
      tenantId: shopB.tenantId,
      public: { phoneNumberId: '1093000009999', wabaId: '2287000009999' },
      secrets: { accessToken: 'EAAG-b', appSecret: 'secret-b' },
    })
    expect(await run(signed(receipt('failed'), 'secret-b'), shopB.tenantId)).toBe('processed')
    now = await payload.findByID({
      collection: 'notification-logs',
      id: wa.id,
      overrideAccess: true,
    })
    expect(now.status).toBe('read')
  })

  it('handles STOP, START and other replies once each', async () => {
    const reply = (id: string, text: string) =>
      signed({
        entry: [
          {
            changes: [
              {
                field: 'messages',
                value: {
                  messages: [{ id, from: '919988776655', type: 'text', text: { body: text } }],
                },
              },
            ],
          },
        ],
      })
    const run = async (body: ReturnType<typeof signed>) => {
      const req = await reqAs(payload)
      return withTransaction(req, () => handleWhatsAppWebhook(req, shopA.tenantId, body))
    }
    await run(reply('wamid.in.1', 'Where is my order?'))
    await run(reply('wamid.in.1', 'Where is my order?')) // Meta retries: stored once
    await run(reply('wamid.in.2', 'STOP'))
    const logs = await logsOf(order.id, {
      or: [{ direction: { equals: 'in' } }, { kind: { equals: 'reply' } }],
    })
    expect(logs.map((l) => [l.direction, l.kind, l.milestone ?? null])).toEqual([
      ['in', 'order', null],
      ['out', 'reply', 'auto_reply'],
      ['in', 'order', null],
      ['out', 'reply', 'reply_stop'],
    ])
    expect(logs[0]!.text).toBe('Where is my order?')
    const { docs: prefs } = await payload.find({
      collection: 'contact-preferences',
      where: {
        and: [{ tenant: { equals: shopA.tenantId } }, { value: { equals: '+919988776655' } }],
      },
      overrideAccess: true,
    })
    expect(prefs[0]!.whatsapp).toMatchObject({ optedIn: false, source: 'checkout' })
    expect(prefs[0]!.whatsapp?.optedOutAt).toBeTruthy()
    await run(reply('wamid.in.3', 'start'))
    const { docs: again } = await payload.find({
      collection: 'contact-preferences',
      where: {
        and: [{ tenant: { equals: shopA.tenantId } }, { value: { equals: '+919988776655' } }],
      },
      overrideAccess: true,
    })
    expect(again[0]!.whatsapp).toMatchObject({ optedIn: true, source: 'reply', optedOutAt: null })
  })

  it('updates a template from Meta’s template webhook', async () => {
    const req = await reqAs(payload)
    await withTransaction(req, () =>
      handleWhatsAppWebhook(
        req,
        shopA.tenantId,
        signed({
          entry: [
            {
              changes: [
                {
                  field: 'message_template_status_update',
                  value: {
                    event: 'REJECTED',
                    message_template_name: 'shipment_delivered',
                    message_template_language: 'en',
                    reason: 'INVALID_FORMAT',
                  },
                },
              ],
            },
          ],
        }),
      ),
    )
    const { docs } = await payload.find({
      collection: 'notification-templates',
      where: {
        and: [
          { tenant: { equals: shopA.tenantId } },
          { 'whatsapp.name': { equals: 'shipment_delivered' } },
        ],
      },
      overrideAccess: true,
    })
    expect(docs[0]).toMatchObject({ status: 'rejected', rejectionReason: 'INVALID_FORMAT' })
  })
})

describe('who can change order updates', () => {
  const settings = {
    milestones: [
      { key: 'shipment_packed' as const, email: 'on' as const, whatsapp: 'off' as const },
    ],
    packedDelayMinutes: 30,
    quietHours: { enabled: false, start: '21:00', end: '09:00' },
    whatsappOptInDefault: false,
    staffAlertEmails: ['Orders@Note.test'],
  }

  it('lets the owner save settings, only for their own store', async () => {
    await asOwner(shopA, (req) => saveSettings(req, shopA.tenantId, settings))
    const { docs } = await payload.find({
      collection: 'notification-settings',
      where: { tenant: { equals: shopA.tenantId } },
      overrideAccess: true,
    })
    expect(docs[0]).toMatchObject({
      packedDelayMinutes: 30,
      whatsappOptInDefault: false,
      staffAlertEmails: ['orders@note.test'],
    })
    expect(docs[0]!.milestones!.find((m) => m.key === 'shipment_packed')).toMatchObject({
      email: 'on',
      whatsapp: 'off',
      sms: 'off',
    })
    expect(docs[0]!.milestones!.find((m) => m.key === 'order_confirmed')).toMatchObject({
      email: 'on',
      whatsapp: 'on',
    })
    await expect(
      asOwner(shopB, (req) => saveSettings(req, shopA.tenantId, settings)),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
    const viewing = await reqAs(payload, inStoreSession(admin, shopA.tenantId, 'view'))
    await expect(
      withTransaction(viewing, () => saveSettings(viewing, shopA.tenantId, settings)),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })

  it('emails the staff alert addresses about a new order', async () => {
    const order = await placeCod(shopA, {
      contact: { name: 'Kabir', email: 'kabir@example.com', phone: '90000 11111' },
      shippingAddress: { ...sampleOrderInput().shippingAddress, phone: '90000 11111' },
    })
    const staff = (await logsOf(order.id, { kind: { equals: 'staff' } })) as NotificationLog[]
    expect(staff).toHaveLength(1)
    expect(staff[0]).toMatchObject({ to: 'orders@note.test', milestone: 'new_order' })
    expect(await sendLog(payload, String(staff[0]!.id))).toBe('sent')
  })

  it('refuses a resend within 10 minutes, and to someone viewing as support', async () => {
    const { docs } = await payload.find({
      collection: 'notification-logs',
      where: {
        and: [
          { tenant: { equals: shopA.tenantId } },
          { status: { equals: 'sent' } },
          { kind: { equals: 'order' } },
        ],
      },
      limit: 1,
      overrideAccess: true,
    })
    const log = docs[0]!
    const orderId = String(typeof log.order === 'object' ? log.order!.id : log.order)
    await expect(
      asOwner(shopA, (req) => resendMessage(req, orderId, String(log.id))),
    ).rejects.toMatchObject({
      message: expect.stringMatching(/10 minutes/),
    })
    const viewing = await reqAs(payload, inStoreSession(admin, shopA.tenantId, 'view'))
    await expect(
      withTransaction(viewing, () => resendMessage(viewing, orderId, String(log.id))),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('sends a test email with a sample order', async () => {
    const result = await sendTest(await reqAs(payload, shopA.owner), {
      store: shopA.tenantId,
      milestone: 'shipment_shipped',
      variant: 'default',
      channel: 'email',
      to: 'a@note.test',
    })
    expect(result.outcome).toBe('sent')
  })
})

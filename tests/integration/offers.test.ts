import type { Payload, PayloadRequest } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { withTransaction } from '@/lib/db/transaction'
import { findCart, newCartToken, readRestoreToken, restoreCart, saveCart } from '@/modules/cart'
import { remindAbandonedCarts } from '@/modules/cart/services/abandoned'
import { assertCartsAccess, saveAbandonedSettings } from '@/modules/cart/services/settings'
import { readUnsubscribeToken, setOfferConsent, unsubscribeToken } from '@/modules/notifications'
import {
  campaignAudience,
  saveCampaign,
  saveOfferSettings,
  sendCampaign,
} from '@/modules/notifications/services/campaigns'
import { sendPrepared } from '@/modules/notifications/services/prepared'
import type { NotificationLog, Plan } from '@/payload-types'

import {
  createPlatformUser,
  reqAs,
  seedPlans,
  startPayload,
  stopPayload,
  type TestUser,
} from './helpers'
import { buildShop, type Shop } from './shop'

// Offer messages and abandoned carts (docs/18, docs/screens Offer messages, Abandoned carts):
// only shoppers who agreed to offers on that channel, one weekly cap, an unsubscribe that stops
// queued messages, and cart reminders that stop when the cart is ordered or emptied.

let payload: Payload
let plans: Record<string, Plan>
let admin: TestUser
let shopA: Shop
let shopB: Shop

const asOwner = async <T>(shop: Shop, fn: (req: PayloadRequest) => Promise<T>) => {
  const req = await reqAs(payload, shop.owner)
  return withTransaction(req, () => fn(req))
}
const asSystem = async <T>(fn: (req: PayloadRequest) => Promise<T>) => {
  const req = await reqAs(payload)
  return withTransaction(req, () => fn(req))
}

const logsFor = async (tenantId: string, milestone: string) =>
  (
    await payload.find({
      collection: 'notification-logs',
      where: {
        and: [{ tenant: { equals: tenantId } }, { milestone: { equals: milestone } }],
      },
      sort: 'createdAt',
      pagination: false,
      overrideAccess: true,
    })
  ).docs

const send = async (log: NotificationLog, tenantId: string) => {
  let last: Partial<NotificationLog> = {}
  const result = await sendPrepared(payload, log, tenantId, async (data) => {
    last = data
    await payload.update({
      collection: 'notification-logs',
      id: log.id,
      data,
      overrideAccess: true,
    })
  })
  return { result, last }
}

const campaign = (title: string) => ({
  title,
  subject: `${title}: 10% off`,
  headline: '10% off taps this week',
  channels: ['email' as const],
  sendAt: new Date().toISOString(),
})

beforeAll(async () => {
  payload = await startPayload()
  plans = await seedPlans(payload)
  admin = await createPlatformUser(payload, 'admin@platform.test', 'super-admin')
  shopA = await buildShop(payload, {
    admin,
    plan: plans.starter!,
    slug: 'off-a',
    ownerEmail: 'a@off.test',
  })
  shopB = await buildShop(payload, {
    admin,
    plan: plans.starter!,
    slug: 'off-b',
    ownerEmail: 'b@off.test',
  })
  await asSystem(async (req) => {
    await setOfferConsent(req, shopA.tenantId, 'email', 'asha@example.com', true, 'checkout')
    await setOfferConsent(req, shopA.tenantId, 'email', 'vikram@example.com', true, 'signup')
    // Agreed in store B only: store A never messages them
    await setOfferConsent(req, shopB.tenantId, 'email', 'meera@example.com', true, 'checkout')
  })
})

afterAll(async () => {
  await stopPayload(payload)
})

describe('offer messages', () => {
  it('goes only to shoppers who agreed to offers in this store, within the weekly cap', async () => {
    await asOwner(shopA, (req) =>
      saveOfferSettings(req, shopA.tenantId, {
        maxPerShopperPerWeek: 1,
        sendWindow: { start: '00:00', end: '23:59' },
      }),
    )
    const first = await asOwner(shopA, (req) =>
      saveCampaign(req, shopA.tenantId, campaign('Diwali')),
    )
    const { recipients } = await asSystem((req) => campaignAudience(req, shopA.tenantId, first))
    expect(recipients.map((r) => r.to).sort()).toEqual(['asha@example.com', 'vikram@example.com'])
    const sent = await asSystem((req) => sendCampaign(req, first))
    expect(sent.stats).toMatchObject({ email: 2, skipped: 0 })

    // A second message the same week is over the cap of one
    const second = await asOwner(shopA, (req) =>
      saveCampaign(req, shopA.tenantId, campaign('Weekend')),
    )
    const again = await asSystem((req) => campaignAudience(req, shopA.tenantId, second))
    expect(again).toMatchObject({ recipients: [], capped: 2 })
  })

  it('stops a queued message when the shopper unsubscribes', async () => {
    const token = unsubscribeToken(shopA.tenantId, 'email', 'asha@example.com')
    expect(readUnsubscribeToken(token)).toEqual({
      tenantId: shopA.tenantId,
      channel: 'email',
      value: 'asha@example.com',
    })
    expect(readUnsubscribeToken(`${token.slice(0, -2)}xx`)).toBeNull()

    await asSystem((req) =>
      setOfferConsent(req, shopA.tenantId, 'email', 'asha@example.com', false, 'account'),
    )
    const logs = await logsFor(shopA.tenantId, 'offer_message')
    const asha = logs.find((l) => l.to === 'asha@example.com')!
    const vikram = logs.find((l) => l.to === 'vikram@example.com')!
    expect(JSON.parse(asha.text!).email.unsubscribeUrl).toMatch(/\/u\//)
    expect((await send(asha, shopA.tenantId)).last).toMatchObject({
      status: 'skipped',
      skipReason: 'no_offer_consent',
    })
    expect((await send(vikram, shopA.tenantId)).result).toBe('sent')
  })
})

describe('abandoned carts', () => {
  const leftAgo = async (cartId: string | number, minutes: number) =>
    payload.update({
      collection: 'carts',
      id: cartId,
      data: { lastActivityAt: new Date(Date.now() - minutes * 60_000).toISOString() },
      overrideAccess: true,
    })

  it('reminds a left cart once per step, only with offer consent', async () => {
    const consented = await saveCart(
      payload,
      shopB.tenantId,
      newCartToken(),
      [{ productId: shopB.towel, variantId: null, qty: 2 }],
      { contact: { name: 'Meera Iyer', email: 'meera@example.com' } },
    )
    const noConsent = await saveCart(
      payload,
      shopB.tenantId,
      newCartToken(),
      [{ productId: shopB.towel, variantId: null, qty: 1 }],
      { contact: { email: 'guest@example.com' } },
    )
    // Not left long enough yet
    await leftAgo(consented.id, 20)
    const req = await reqAs(payload)
    expect(await remindAbandonedCarts(req)).toBe(0)

    await leftAgo(consented.id, 90)
    await leftAgo(noConsent.id, 90)
    expect(await remindAbandonedCarts(req)).toBe(1)
    expect(await remindAbandonedCarts(req)).toBe(0)

    const [reminder] = await logsFor(shopB.tenantId, 'cart_reminder_1')
    expect(reminder).toMatchObject({ kind: 'cart', to: 'meera@example.com' })
    const email = JSON.parse(reminder!.text!).email
    expect(email.paragraphs.join(' ')).toMatch(/Cotton bath towel × 2/)
    expect(email.button.url).toMatch(/\/cart\/restore\//)

    const left = await payload.findByID({
      collection: 'carts',
      id: noConsent.id,
      overrideAccess: true,
    })
    expect(left.reminderNote).toBe('Not reminded: no offer consent')
    expect(left.reminders).toEqual([])
    const reminded = await payload.findByID({
      collection: 'carts',
      id: consented.id,
      overrideAccess: true,
    })
    expect(reminded).toMatchObject({ leftSummary: 'Cotton bath towel × 2' })
    expect(reminded.leftValueMinor).toBeGreaterThan(0)

    // The second reminder a day later, by email only (the default), with the store's code
    await payload.create({
      collection: 'coupons',
      data: {
        tenant: shopB.tenantId,
        code: 'COMEBACK5',
        codeNormalized: 'COMEBACK5',
        type: 'percent',
        percent: 5,
        status: 'active',
      },
      overrideAccess: true,
    })
    await asOwner(shopB, (r) =>
      saveAbandonedSettings(r, shopB.tenantId, {
        firstAfterMinutes: 60,
        secondAfterHours: 24,
        channels: ['email', 'whatsapp'],
        secondChannels: ['email'],
        secondCoupon: 'comeback5',
      }),
    )
    await payload.update({
      collection: 'carts',
      id: consented.id,
      data: {
        reminders: (reminded.reminders ?? []).map((r) => ({
          ...r,
          at: new Date(Date.now() - 25 * 3_600_000).toISOString(),
        })),
      },
      overrideAccess: true,
    })
    expect(await remindAbandonedCarts(req)).toBe(1)
    const [second] = await logsFor(shopB.tenantId, 'cart_reminder_2')
    expect(JSON.parse(second!.text!).email.paragraphs.join(' ')).toMatch(/COMEBACK5/)
  })

  it('restores the cart from the link, and an ordered cart gets no more reminders', async () => {
    const [reminder] = await logsFor(shopB.tenantId, 'cart_reminder_1')
    const url: string = JSON.parse(reminder!.text!).email.button.url
    const cartId = readRestoreToken(url.split('/cart/restore/')[1]!)!
    expect(cartId).toBeTruthy()
    const restored = await restoreCart(payload, shopB.tenantId, cartId)
    expect(restored?.count).toBe(2)
    const cart = await findCart(payload, shopB.tenantId, restored!.token)
    expect(String(cart?.id)).toBe(cartId)
    // Another store can't open it
    expect(await restoreCart(payload, shopA.tenantId, cartId)).toBeNull()

    await payload.update({
      collection: 'carts',
      id: cartId,
      data: { status: 'converted' },
      overrideAccess: true,
    })
    const [second] = await logsFor(shopB.tenantId, 'cart_reminder_2')
    expect((await send(second!, shopB.tenantId)).last).toMatchObject({
      status: 'skipped',
      skipReason: 'stale',
    })
  })

  it('lets only this store’s owners and managers change the reminders', async () => {
    const req = await reqAs(payload, shopA.owner)
    await expect(assertCartsAccess(req, shopB.tenantId, 'write')).rejects.toThrow()
    await expect(
      asOwner(shopB, (r) =>
        saveAbandonedSettings(r, shopB.tenantId, {
          firstAfterMinutes: 60,
          secondAfterHours: null,
          channels: ['email'],
          secondChannels: ['email'],
          secondCoupon: 'NOSUCHCODE',
        }),
      ),
    ).rejects.toThrow('Pick an active coupon')
  })
})

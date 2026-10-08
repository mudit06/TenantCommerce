import type { PayloadRequest } from 'payload'

import { idOf } from '@/access'
import { formatINR } from '@/lib/money'
import {
  insideWindow,
  offerConfig,
  offersAgreed,
  offersThisWeek,
  preferenceFor,
  queuePreparedEmail,
  queuePreparedWhatsApp,
  storeFacts,
  unsubscribeToken,
} from '@/modules/notifications'
import { quoteCheckout } from '@/modules/orders'
import { featureConfig, isFeatureEnabled } from '@/modules/tenancy'
import type { Cart } from '@/payload-types'

import { cartLinesOf } from './carts'
import { restoreToken } from './restore'

// Abandoned cart reminders (docs/18 "Abandoned cart", docs/screens Abandoned carts): a cart with
// items and a contact that went quiet gets a first reminder after the store's delay and an
// optional second, only on channels the shopper agreed to offers on, one series a week per
// shopper, inside the send window. Ordering, emptying the cart or unsubscribing stops them
// (checked again when each one is sent).

type CartConfig = {
  firstAfterMinutes: number
  secondAfterHours: number | null
  secondCoupon: string | null
  channels: ('email' | 'whatsapp')[]
  secondChannels?: ('email' | 'whatsapp')[]
}

const contactOf = (cart: Cart) => ({
  email: cart.contact?.email?.toLowerCase() || null,
  phone: cart.contact?.phone || null,
  name: cart.contact?.name || null,
})

async function remind(
  req: PayloadRequest,
  tenantId: string,
  cart: Cart,
  config: CartConfig,
  step: 1 | 2,
) {
  const contact = contactOf(cart)
  const store = await storeFacts(req.payload, tenantId, req)
  const offer = await offerConfig(req.payload, tenantId, req)
  const whatsappOn = await isFeatureEnabled(req.payload, tenantId, 'whatsapp-offers')
  const sendAfter = offer ? insideWindow(new Date(), offer.sendWindow) : new Date()
  const quote = await quoteCheckout(req.payload, tenantId, { lines: cartLinesOf(cart), live: null })
  const lines = quote.lines.filter((l) => !l.problem)
  if (!lines.length)
    return {
      sent: [] as { channel: 'email' | 'whatsapp'; to: string }[],
      note: 'Nothing in it can be bought now',
      summary: null,
      valueMinor: null,
    }
  const total = quote.pricing.totals.grandTotalMinor
  const netOf = new Map(quote.pricing.lines.map((l) => [l.key, l.netMinor]))
  const firstName = contact.name?.split(' ')[0] ?? null
  const link = `${store.storeOrigin}/cart/restore/${restoreToken(String(cart.id))}`
  const summary =
    lines.length > 1 ? `${lines[0]!.title} and ${lines.length - 1} more` : lines[0]!.title
  const sent: { channel: 'email' | 'whatsapp'; to: string }[] = []
  let noConsent = 0
  let weekly = 0
  const channels = step === 2 ? (config.secondChannels ?? config.channels) : config.channels
  for (const channel of channels) {
    const to = channel === 'email' ? contact.email : contact.phone
    if (!to || (channel === 'whatsapp' && !whatsappOn)) continue
    const pref = await preferenceFor(
      req.payload,
      tenantId,
      channel === 'email' ? 'email' : 'phone',
      to,
      req,
    )
    if (!offersAgreed(pref, channel)) {
      noConsent += 1
      continue
    }
    // One series a week per shopper; the second reminder belongs to the same series
    if (
      step === 1 &&
      offer &&
      (await offersThisWeek(req, tenantId, to)) >= offer.maxPerShopperPerWeek
    ) {
      weekly += 1
      continue
    }
    const check = {
      consent: {
        type: channel === 'email' ? ('email' as const) : ('phone' as const),
        value: to,
        channel,
      },
      cartId: String(cart.id),
    }
    const code = step === 2 && config.secondCoupon ? config.secondCoupon : null
    const log =
      channel === 'email'
        ? await queuePreparedEmail(req, {
            tenantId,
            kind: 'cart',
            milestone: `cart_reminder_${step}`,
            to,
            dedupeKey: `cart:${cart.id}:${step}:email`,
            sendAfter,
            check,
            email: {
              subject: step === 1 ? 'Your cart is saved' : 'Still thinking it over?',
              heading: step === 1 ? 'Your cart is saved' : 'Your cart is still here',
              paragraphs: [
                `Hi ${firstName ?? 'there'}, your cart at ${store.storeName} is saved. Prices include GST and can change when an offer ends.`,
                // What each line costs today, after any running scheme
                ...lines.map(
                  (l) =>
                    `${l.title}${l.options ? ` · ${l.options}` : ''}${l.qty > 1 ? ` × ${l.qty}` : ''}: ${formatINR(netOf.get(l.key) ?? l.unitMinor * l.qty)}`,
                ),
                `Total today: ${formatINR(total)}.`,
                ...(code ? [`Use the code ${code} at the cart.`] : []),
              ],
              button: { label: 'Return to your cart', url: link },
              footer: `You get this because you asked for offers from ${store.storeName} by email.`,
              unsubscribeUrl: `${store.storeOrigin}/u/${unsubscribeToken(tenantId, 'email', to)}`,
            },
          })
        : await queuePreparedWhatsApp(req, {
            tenantId,
            kind: 'cart',
            milestone: `cart_reminder_${step}`,
            template: 'cart_reminder',
            to,
            dedupeKey: `cart:${cart.id}:${step}:whatsapp`,
            params: [firstName ?? 'there', code ? `${summary} (code ${code})` : summary],
            buttonParam: link.replace(`${store.storeOrigin}/`, ''),
            sendAfter,
            check,
          })
    if (log) sent.push({ channel, to })
  }
  const note = sent.length
    ? null
    : noConsent
      ? 'Not reminded: no offer consent'
      : weekly
        ? 'Not reminded: already had offers this week'
        : 'Not reminded: no contact for the channels'
  const itemNames = lines
    .slice(0, 2)
    .map((l) => `${l.title}${l.qty > 1 ? ` × ${l.qty}` : ''}`)
    .join(', ')
  return {
    sent,
    note,
    summary: lines.length > 2 ? `${itemNames} and ${lines.length - 2} more` : itemNames,
    valueMinor: total,
  }
}

/** One run of the reminder job across stores. */
export async function remindAbandonedCarts(req: PayloadRequest, now = new Date()) {
  const { docs } = await req.payload.find({
    collection: 'carts',
    where: {
      and: [
        { status: { equals: 'active' } },
        { 'items.product': { exists: true } },
        { lastActivityAt: { less_than: new Date(now.getTime() - 15 * 60_000).toISOString() } },
        {
          lastActivityAt: { greater_than: new Date(now.getTime() - 8 * 86_400_000).toISOString() },
        },
        { or: [{ 'contact.email': { exists: true } }, { 'contact.phone': { exists: true } }] },
      ],
    },
    depth: 0,
    limit: 500,
    pagination: false,
    overrideAccess: true,
  })
  const configs = new Map<string, CartConfig | null>()
  let reminded = 0
  for (const cart of docs) {
    const tenantId = idOf(cart.tenant)!
    if (!configs.has(tenantId)) {
      configs.set(
        tenantId,
        await featureConfig<CartConfig>(req.payload, tenantId, 'abandoned-cart'),
      )
    }
    const config = configs.get(tenantId)
    if (!config || !(cart.contact?.email || cart.contact?.phone)) continue
    const idle = now.getTime() - new Date(cart.lastActivityAt ?? cart.updatedAt).getTime()
    const reminders = cart.reminders ?? []
    const firstSent = reminders.find((r) => r.step === 1)
    let step: 1 | 2 | null = null
    if (!reminders.length && !cart.reminderNote && idle >= config.firstAfterMinutes * 60_000)
      step = 1
    else if (
      firstSent?.at &&
      config.secondAfterHours &&
      !reminders.some((r) => r.step === 2) &&
      now.getTime() - new Date(firstSent.at).getTime() >= config.secondAfterHours * 3_600_000
    ) {
      step = 2
    }
    if (!step) continue
    const { sent, note, summary, valueMinor } = await remind(req, tenantId, cart, config, step)
    const at = now.toISOString()
    await req.payload.update({
      collection: 'carts',
      id: cart.id,
      data: {
        abandonedAt: cart.abandonedAt ?? at,
        ...(summary ? { leftSummary: summary, leftValueMinor: valueMinor } : {}),
        reminders: [...reminders, ...sent.map((s) => ({ step, channel: s.channel, to: s.to, at }))],
        ...(step === 1 && note ? { reminderNote: note } : {}),
      },
      // Not saveCart: the shopper didn't change the cart, so its activity clock stays
      overrideAccess: true,
    })
    if (sent.length) reminded += 1
  }
  return reminded
}

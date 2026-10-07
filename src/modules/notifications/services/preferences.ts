import type { Payload, PayloadRequest } from 'payload'

import type { ContactPreference } from '@/payload-types'

// What a phone number agreed to in this store (docs/18 "Consent, opt-out and the tracking
// link"). Kept per contact point, so STOP holds for the guest's next order too.

export const CHECKOUT_WORDING = 'checkout-whatsapp-v1'

export async function preferenceFor(
  payload: Payload,
  tenantId: string,
  type: 'phone' | 'email',
  value: string,
  req?: PayloadRequest,
): Promise<ContactPreference | null> {
  const { docs } = await payload.find({
    collection: 'contact-preferences',
    where: {
      and: [
        { tenant: { equals: tenantId } },
        { type: { equals: type } },
        { value: { equals: value } },
      ],
    },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  return docs[0] ?? null
}

/** Stopped WhatsApp updates (STOP, the tracking page) and not started them again since */
export const whatsappStopped = (pref: ContactPreference | null) =>
  Boolean(pref?.whatsapp?.optedOutAt) && !pref?.whatsapp?.optedIn

/**
 * May this order's updates go on WhatsApp: ticked at checkout, or switched on later (START, the
 * tracking page) after the order was placed; and not stopped since.
 */
export function whatsappOptedInFor(
  order: { whatsappOptIn?: boolean | null; placedAt?: string | null; createdAt: string },
  pref: ContactPreference | null,
): boolean {
  if (whatsappStopped(pref)) return false
  if (order.whatsappOptIn === true) return true
  const at = pref?.whatsapp?.optedIn && pref.whatsapp.at ? new Date(pref.whatsapp.at).getTime() : 0
  return at > new Date(order.placedAt ?? order.createdAt).getTime()
}

/**
 * Turns WhatsApp order updates on or off for one phone. On is a fresh opt-in (the checkout box,
 * START, the tracking page switch); off is an opt-out that every later send checks.
 */
export async function setWhatsAppUpdates(
  req: PayloadRequest,
  tenantId: string,
  phone: string,
  on: boolean,
  source: 'checkout' | 'account' | 'reply' | 'tracking-page',
  extra: Partial<Pick<ContactPreference, 'lastAutoReplyAt'>> = {},
): Promise<ContactPreference> {
  const now = new Date().toISOString()
  const existing = await preferenceFor(req.payload, tenantId, 'phone', phone, req)
  const whatsapp = on
    ? {
        optedIn: true,
        at: now,
        source,
        wordingVersion:
          source === 'checkout' ? CHECKOUT_WORDING : existing?.whatsapp?.wordingVersion,
        optedOutAt: null,
      }
    : { ...existing?.whatsapp, optedIn: false, optedOutAt: now }
  if (existing) {
    return req.payload.update({
      collection: 'contact-preferences',
      id: existing.id,
      data: { whatsapp, ...extra },
      overrideAccess: true,
      req,
    })
  }
  return req.payload.create({
    collection: 'contact-preferences',
    data: { tenant: tenantId, type: 'phone', value: phone, whatsapp, ...extra },
    overrideAccess: true,
    req,
  })
}

/** Remembers when the automatic answer last went out, so it goes at most once a day */
export async function markAutoReply(req: PayloadRequest, tenantId: string, phone: string) {
  const existing = await preferenceFor(req.payload, tenantId, 'phone', phone, req)
  const at = new Date().toISOString()
  if (existing) {
    await req.payload.update({
      collection: 'contact-preferences',
      id: existing.id,
      data: { lastAutoReplyAt: at },
      overrideAccess: true,
      req,
    })
    return
  }
  await req.payload.create({
    collection: 'contact-preferences',
    data: { tenant: tenantId, type: 'phone', value: phone, lastAutoReplyAt: at },
    overrideAccess: true,
    req,
  })
}

export type OfferChannel = 'email' | 'whatsapp'

/**
 * Offers and new launches (docs/18 "Consent"): agreed to by the shopper only, by email or by
 * WhatsApp, kept on the email or phone it goes to. Separate from order updates: turning offers
 * off never stops them.
 */
export async function setOfferConsent(
  req: PayloadRequest,
  tenantId: string,
  channel: OfferChannel,
  value: string,
  on: boolean,
  source: 'checkout' | 'signup' | 'account' | 'affiliate',
): Promise<ContactPreference> {
  const type = channel === 'email' ? 'email' : 'phone'
  const now = new Date().toISOString()
  const existing = await preferenceFor(req.payload, tenantId, type, value, req)
  const current = existing?.offers?.[channel]
  const next = on
    ? { optedIn: true, at: now, source, wordingVersion: `offers-${channel}-v1`, optedOutAt: null }
    : { ...current, optedIn: false, optedOutAt: now }
  const offers = { ...existing?.offers, [channel]: next }
  if (existing) {
    return req.payload.update({
      collection: 'contact-preferences',
      id: existing.id,
      data: { offers },
      overrideAccess: true,
      req,
    })
  }
  return req.payload.create({
    collection: 'contact-preferences',
    data: { tenant: tenantId, type, value, offers },
    overrideAccess: true,
    req,
  })
}

/** Has this email or phone agreed to offers on the channel, and not withdrawn since */
export const offersAgreed = (pref: ContactPreference | null, channel: OfferChannel) =>
  Boolean(pref?.offers?.[channel]?.optedIn) && !pref?.suppressed?.reason

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

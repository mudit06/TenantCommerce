'use server'

import { createLocalReq } from 'payload'

import { getPayloadClient } from '@/lib/data/payload'
import { withTransaction } from '@/lib/db/transaction'
import { allow } from '@/lib/rate-limit'
import { indianMobile } from '@/modules/customers'
import { setOfferConsent } from '@/modules/notifications'
import { isFeatureEnabled } from '@/modules/tenancy'

import { currentStore, visitorMeta } from './server'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * The Offers page sign-up: an email gets offers by email, a mobile number on WhatsApp (when the
 * store sends WhatsApp offers). Only what the shopper ticked is recorded (docs/18 "Consent").
 */
export async function signUpForOffers(input: {
  contact: string
  email: boolean
  whatsapp: boolean
}): Promise<{ ok: true; data: { message: string } } | { ok: false; message: string }> {
  try {
    const store = await currentStore()
    if (!store) return { ok: false, message: 'This store isn’t open at the moment.' }
    const payload = await getPayloadClient()
    if (!(await isFeatureEnabled(payload, store.tenantId, 'offer-messages'))) {
      return { ok: false, message: 'This store doesn’t send offers.' }
    }
    const { ip } = await visitorMeta()
    if (!allow(`offer-signup:${ip ?? 'local'}`, { max: 5, windowMs: 10 * 60_000 })) {
      return { ok: false, message: 'Too many tries. Please wait a few minutes.' }
    }
    const value = String(input.contact ?? '').trim()
    const isEmail = EMAIL.test(value)
    const phone = isEmail ? null : indianMobile(value)
    if (!isEmail && !phone) {
      return { ok: false, message: 'Enter an email or a 10-digit mobile number.' }
    }
    if (isEmail && !input.email) return { ok: false, message: 'Tick “Send me offers by email”.' }
    if (phone && !input.whatsapp)
      return { ok: false, message: 'Tick “Send me offers on WhatsApp”.' }
    if (phone && !(await isFeatureEnabled(payload, store.tenantId, 'whatsapp-offers'))) {
      return { ok: false, message: 'Offers come by email from this store. Enter your email.' }
    }
    const req = await createLocalReq({}, payload)
    await withTransaction(req, () =>
      setOfferConsent(
        req,
        store.tenantId,
        isEmail ? 'email' : 'whatsapp',
        isEmail ? value.toLowerCase() : phone!,
        true,
        'signup',
      ),
    )
    return {
      ok: true,
      data: {
        message: isEmail
          ? 'Thank you. Offers will come to your email.'
          : 'Thank you. Offers will come on WhatsApp.',
      },
    }
  } catch (error) {
    console.error('[offers] sign-up failed', error)
    return { ok: false, message: 'Something went wrong. Please try again.' }
  }
}

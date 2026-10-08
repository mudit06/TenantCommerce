'use server'

import { createLocalReq } from 'payload'

import { getPayloadClient } from '@/lib/data/payload'
import { withTransaction } from '@/lib/db/transaction'
import { readUnsubscribeToken, setOfferConsent } from '@/modules/notifications'

import { currentStore } from './server'

/**
 * The unsubscribe page (docs/screens storefront `st-offer-messages` rule 4): stops offers on
 * the link's channel for its address, in this store only; order updates are not touched.
 * `on` true is the page's Undo.
 */
export async function setOffersFromLink(
  token: string,
  on: boolean,
): Promise<{ ok: boolean; message?: string }> {
  const parsed = readUnsubscribeToken(token)
  const store = await currentStore()
  if (!parsed || !store || store.tenantId !== parsed.tenantId) {
    return { ok: false, message: 'This link isn’t valid.' }
  }
  const payload = await getPayloadClient()
  const req = await createLocalReq({}, payload)
  await withTransaction(req, () =>
    setOfferConsent(req, parsed.tenantId, parsed.channel, parsed.value, on, 'account'),
  )
  return { ok: true }
}

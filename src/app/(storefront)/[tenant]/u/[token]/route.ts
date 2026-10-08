import { createLocalReq } from 'payload'

import { getPayloadClient } from '@/lib/data/payload'
import { withTransaction } from '@/lib/db/transaction'
import { getStoreByHost } from '@/lib/data/store'
import { readUnsubscribeToken, setOfferConsent } from '@/modules/notifications'
import { STORE_HOST_HEADER } from '@/storefront/constants'

type Context = { params: Promise<{ tenant: string; token: string }> }

/**
 * The unsubscribe link in every offer email (docs/18). GET opens the page with its one-tap
 * button; POST is the mail app's one-click unsubscribe (RFC 8058 List-Unsubscribe-Post).
 */
export async function GET(_request: Request, { params }: Context) {
  const { token } = await params
  // A relative address: the store's own domain, whatever the internal rewrite
  return new Response(null, { status: 303, headers: { Location: `/unsubscribe/${token}` } })
}

export async function POST(request: Request, { params }: Context) {
  const { token } = await params
  const parsed = readUnsubscribeToken(decodeURIComponent(token))
  const host = request.headers.get(STORE_HOST_HEADER)
  const store = host ? await getStoreByHost(host) : null
  if (!parsed || !store || store.tenantId !== parsed.tenantId) {
    return new Response('Not found', { status: 404 })
  }
  const payload = await getPayloadClient()
  const req = await createLocalReq({}, payload)
  await withTransaction(req, () =>
    setOfferConsent(req, parsed.tenantId, parsed.channel, parsed.value, false, 'account'),
  )
  return new Response('Unsubscribed', { status: 200 })
}

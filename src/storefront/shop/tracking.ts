'use server'

import { createLocalReq } from 'payload'

import { getPayloadClient } from '@/lib/data/payload'
import { withTransaction } from '@/lib/db/transaction'
import { allow, LIMITS } from '@/lib/rate-limit'
import { getStoreByHost } from '@/lib/data/store'
import { setTrackingUpdates, TRACKING_CODE } from '@/modules/notifications'

import { headers } from 'next/headers'

import { STORE_HOST_HEADER } from '../constants'
import { visitorMeta } from './server'

/**
 * The WhatsApp switch and "Stop updates" on the tracking page (docs/07
 * `PATCH /track/:code/preferences`): for this order's phone only. Order emails still arrive.
 */
export async function setTrackingWhatsApp(
  code: string,
  on: boolean,
): Promise<{ ok: true; whatsapp: boolean } | { ok: false; message: string }> {
  const host = (await headers()).get(STORE_HOST_HEADER)
  const store = host ? await getStoreByHost(host) : null
  if (!store || !TRACKING_CODE.test(code)) return { ok: false, message: 'This link isn’t valid.' }
  const { ip } = await visitorMeta()
  if (!allow(`tracking:${ip ?? 'unknown'}`, LIMITS.tracking))
    return { ok: false, message: 'Too many tries. Please wait a minute.' }
  try {
    const payload = await getPayloadClient()
    const req = await createLocalReq({}, payload)
    const result = await withTransaction(req, () =>
      setTrackingUpdates(req, store.tenantId, code, on),
    )
    return { ok: true, whatsapp: result.whatsapp }
  } catch {
    return { ok: false, message: 'We couldn’t change this. Please try again.' }
  }
}

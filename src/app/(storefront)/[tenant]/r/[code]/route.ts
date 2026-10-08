import { cookies } from 'next/headers'
import { createLocalReq } from 'payload'

import { getPayloadClient } from '@/lib/data/payload'
import { getStoreByHost } from '@/lib/data/store'
import { programConfig, recordClick, REF_COOKIE } from '@/modules/affiliate'
import { STORE_HOST_HEADER } from '@/storefront/constants'

const CLICK_COOKIE = 'te_ref_click'

type Context = { params: Promise<{ tenant: string; code: string }> }

/** A store page within this store only: "/products/x", never another site */
const safePath = (to: string | null) =>
  to && /^\/(?!\/)[\w\-./?=&%]*$/.test(to) && !to.includes('..') ? to : '/'

/**
 * An affiliate's link (docs/screens Affiliate dashboard rule 3): `/r/CODE`, or
 * `/r/CODE?to=/products/x` for any page. Sets the referral cookie for the program's days (the
 * last link clicked wins), counts the click, and goes to the page. An unknown or paused code just
 * goes to the page.
 */
export async function GET(request: Request, { params }: Context) {
  const { code } = await params
  const host = request.headers.get(STORE_HOST_HEADER)
  const store = host ? await getStoreByHost(host) : null
  const to = safePath(new URL(request.url).searchParams.get('to'))
  if (store) {
    const payload = await getPayloadClient()
    const config = await programConfig(payload, store.tenantId)
    const clean = decodeURIComponent(code).trim().toUpperCase().slice(0, 40)
    const { docs } = config
      ? await payload.find({
          collection: 'affiliates',
          where: {
            and: [
              { tenant: { equals: store.tenantId } },
              { code: { equals: clean } },
              { status: { equals: 'approved' } },
            ],
          },
          limit: 1,
          depth: 0,
          pagination: false,
          overrideAccess: true,
          select: { code: true },
        })
      : { docs: [] }
    const affiliate = docs[0]
    if (affiliate && config) {
      const jar = await cookies()
      const options = {
        httpOnly: true,
        sameSite: 'lax' as const,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      }
      jar.set(REF_COOKIE, affiliate.code, { ...options, maxAge: config.cookieDays * 24 * 60 * 60 })
      // One click per browser per half hour, so a refresh or a double load isn't counted twice
      if (jar.get(CLICK_COOKIE)?.value !== affiliate.code) {
        jar.set(CLICK_COOKIE, affiliate.code, { ...options, maxAge: 30 * 60 })
        await recordClick(
          await createLocalReq({}, payload),
          store.tenantId,
          String(affiliate.id),
        ).catch(() => undefined)
      }
    }
  }
  return new Response(null, { status: 303, headers: { Location: to } })
}

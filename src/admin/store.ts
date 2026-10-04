import { cookies } from 'next/headers'
import type { Payload } from 'payload'
import { cache } from 'react'

import { idOf, storeSessionOf, tenantIdsWithRoles, workspaceOf } from '@/access'
import { storeOriginForHost } from '@/lib/storeOrigin'

// The store a CMS page is about: the one in our team's store session, or the store chosen in the
// store switcher (the multi-tenant plugin's cookie), or the user's only store. Shared by the
// menu, the header and the dashboard so they always agree.

export type CurrentStore = {
  id: string
  name: string
  slug: string
  status: string
  planName?: string
  storeUrl?: string
  primaryHost?: string
}

/** The shopper-facing address of a host (src/lib/storeOrigin). */
export const storeUrlForHost = (host: string | null | undefined) => storeOriginForHost(host)

export async function primaryHostOf(payload: Payload, tenantId: string) {
  const { docs } = await payload.find({
    collection: 'tenant-domains',
    where: { and: [{ tenant: { equals: tenantId } }, { isPrimary: { equals: true } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return docs[0]?.host
}

const SELECTED_STORE_COOKIE = 'payload-tenant'

/** The store ids the user works in, the current one first. */
async function storeIdsFor(user: unknown): Promise<string[]> {
  const session = storeSessionOf(user)
  if (session) return [session.tenantId]
  const ids = tenantIdsWithRoles(user)
  const selected = (await cookies()).get(SELECTED_STORE_COOKIE)?.value
  return selected && ids.includes(selected)
    ? [selected, ...ids.filter((id) => id !== selected)]
    : ids
}

/** The store id a request is about (cached per request by the id list it comes from). */
const loadStore = cache(async (payload: Payload, id: string): Promise<CurrentStore | null> => {
  const tenant = await payload
    .findByID({ collection: 'tenants', id, depth: 1, overrideAccess: true })
    .catch(() => null)
  if (!tenant) return null
  const host = await primaryHostOf(payload, id)
  const plan = typeof tenant.plan === 'object' ? tenant.plan : null
  return {
    id: String(idOf(tenant.id)),
    name: tenant.name,
    slug: tenant.slug,
    status: tenant.status,
    planName: plan?.name,
    primaryHost: host,
    storeUrl: storeUrlForHost(host),
  }
})

/** The current store of a store-workspace page, or null in the platform panel. */
export async function currentStore(payload: Payload, user: unknown): Promise<CurrentStore | null> {
  if (workspaceOf(user) !== 'store') return null
  const [id] = await storeIdsFor(user)
  return id ? loadStore(payload, id) : null
}

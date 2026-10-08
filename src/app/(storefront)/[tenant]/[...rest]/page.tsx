import { notFound } from 'next/navigation'

import { getStoreContext } from '@/storefront/context'
import { notFoundOrRedirect } from '@/storefront/notFoundOrRedirect'

type Props = { params: Promise<{ tenant: string; rest: string[] }> }

/**
 * Any address no page answers (the store's own routes always win): an old address from the
 * vendor's previous site or a moved page goes to its redirect, anything else is the 404 page.
 */
export default async function UnknownAddress({ params }: Props) {
  const { tenant, rest } = await params
  const ctx = await getStoreContext(tenant)
  await notFoundOrRedirect(ctx.store.tenantId, `/${rest.map(decodeURIComponent).join('/')}`)
  notFound()
}

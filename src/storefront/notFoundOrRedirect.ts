import { notFound, permanentRedirect } from 'next/navigation'

import { findRedirect } from '@/lib/data/redirects'

/**
 * A store address with nothing at it: its redirect if it moved (a permanent one, so search
 * engines carry the ranking over), else the 404 page.
 */
export async function notFoundOrRedirect(tenantId: string, path: string): Promise<never> {
  const to = await findRedirect(tenantId, path)
  if (to && to !== path) permanentRedirect(to)
  notFound()
}

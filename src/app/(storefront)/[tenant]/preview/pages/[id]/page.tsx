import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'

import { getDraftPage } from '@/lib/data/content'
import { verifyPreviewToken } from '@/lib/preview-token'
import { PREVIEW_PAGE_HEADER } from '@/storefront/constants'
import { getStoreContext } from '@/storefront/context'
import { PageContent } from '@/storefront/kit/PageContent'
import { PreviewRefresh } from '@/storefront/kit/PreviewRefresh'

type Props = {
  params: Promise<{ tenant: string; id: string }>
  searchParams: Promise<{ token?: string }>
}

// Always the latest draft, never cached (the proxy also sends no-store)
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { index: false, follow: false } }

/**
 * The editor's live preview (docs/screens Page builder rule 4): the page's latest draft in this
 * store's own storefront code. Needs a signed link for this page and this store (src/lib
 * preview-token, made by the admin); anything else is "not found".
 */
export default async function PagePreview({ params, searchParams }: Props) {
  const [{ tenant, id }, { token }] = await Promise.all([params, searchParams])
  const ctx = await getStoreContext(tenant)
  const claims = await verifyPreviewToken(token, process.env.PAYLOAD_SECRET)
  const marked = (await headers()).get(PREVIEW_PAGE_HEADER)
  if (!claims || claims.pageId !== id || marked !== id || claims.tenantId !== ctx.store.tenantId) {
    notFound()
  }
  const page = await getDraftPage(ctx.store.tenantId, id)
  if (!page) notFound()
  return (
    <>
      <PreviewRefresh
        adminOrigin={new URL(process.env.ADMIN_URL ?? 'http://localhost:3000').origin}
      />
      <PageContent ctx={ctx} page={page} />
    </>
  )
}

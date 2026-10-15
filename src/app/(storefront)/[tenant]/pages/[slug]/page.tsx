import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'

import { getPublishedPage } from '@/lib/data/content'
import { getStoreContext } from '@/storefront/context'
import { PageContent } from '@/storefront/kit/PageContent'
import { notFoundOrRedirect } from '@/storefront/notFoundOrRedirect'

/**
 * No page is built ahead: each store's page is rendered on its first visit, then served from the
 * cache until the store's data changes (tag revalidation from Payload hooks) or its data's own
 * expiry passes (docs/13). Keep this page free of request reads (headers, cookies, search params).
 */
export const generateStaticParams = async () => []

type Props = { params: Promise<{ tenant: string; slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tenant, slug } = await params
  const ctx = await getStoreContext(tenant)
  const page = await getPublishedPage(ctx.store.tenantId, slug)
  if (!page) return {}
  return { title: page.seo?.title || page.title, description: page.seo?.description || undefined }
}

/** CMS and policy pages (docs/screens storefront `st-page`, `st-policy`). */
export default async function CmsPage({ params }: Props) {
  const { tenant, slug } = await params
  if (slug === 'home') permanentRedirect('/')
  const ctx = await getStoreContext(tenant)
  const page = await getPublishedPage(ctx.store.tenantId, slug)
  if (!page) {
    await notFoundOrRedirect(ctx.store.tenantId, `/pages/${slug}`)
    notFound()
  }
  return <PageContent ctx={ctx} page={page} />
}

import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'

import { getPublishedPage } from '@/lib/data/content'
import { getStoreContext } from '@/storefront/context'
import { RenderBlocks } from '@/storefront/kit/blocks/RenderBlocks'
import { Breadcrumbs } from '@/storefront/kit/Breadcrumbs'
import { Container } from '@/storefront/kit/ui'

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
  if (!page) notFound()
  const plain = page.template !== 'landing'
  return (
    <>
      {plain ? (
        <Container className="max-w-3xl pt-6">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: page.title, href: `/pages/${page.slug}` },
            ]}
          />
          <h1 className="mt-4 font-heading text-3xl font-bold [text-transform:var(--heading-transform)]">
            {page.title}
          </h1>
        </Container>
      ) : null}
      <RenderBlocks blocks={page.layout} ctx={ctx} />
    </>
  )
}

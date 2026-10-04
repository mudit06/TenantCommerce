import type { StoreContext } from '@/storefront/context'
import type { Page } from '@/payload-types'

import { RenderBlocks } from './blocks/RenderBlocks'
import { Breadcrumbs } from './Breadcrumbs'
import { Container } from './ui'

/**
 * A CMS page as shoppers see it. The template decides the structure only (docs/10): a landing
 * page (and the home page) is its blocks; default and policy pages put breadcrumbs and the title
 * above them. Shared by the live page and the editor's draft preview so they can't drift apart.
 */
export function PageContent({ page, ctx }: { page: Page; ctx: StoreContext }) {
  const plain = page.slug !== 'home' && page.template !== 'landing'
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

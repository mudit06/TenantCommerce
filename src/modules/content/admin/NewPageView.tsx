import type { AdminViewServerProps } from 'payload'

import { adminUrl } from '@/admin/paths'
import { currentStore } from '@/admin/store'
import { AdminScreen } from '@/admin/ui/AdminScreen'
import { ButtonLink, EmptyState, PAGE_TEMPLATES, PageHeader, type PageTemplate } from '@/admin/ui'
import { Icon } from '@/admin/ui/icons'
import { requireSignedIn } from '@/admin/session/requireSignedIn'

const EXAMPLES: Record<PageTemplate, string[]> = {
  default: ['About us', 'Our factory', 'Care and cleaning guide'],
  landing: ['Home page', 'Diwali offers', 'Matt black collection'],
  policy: ['Shipping policy', 'Returns and refunds', 'Privacy policy'],
}

const WHEN: Record<PageTemplate, string> = {
  default: 'A plain content page. Your blocks appear under the page title, like an article.',
  landing: 'Built only from reusable blocks, edge to edge, with no title bar. For pages that sell.',
  policy: 'Legal and policy content. Shoppers reach it from the footer and from checkout.',
}

/**
 * "Create page" (docs/screens Pages): choose what kind of page it is first, then the editor
 * opens with that template set. The template is the page's structure, never its look.
 */
export async function NewPageView(view: AdminViewServerProps) {
  return (
    <AdminScreen view={view}>
      <NewPageContent view={view} />
    </AdminScreen>
  )
}

async function NewPageContent({ view }: { view: AdminViewServerProps }) {
  const { req, permissions } = view.initPageResult
  requireSignedIn(req.user, adminUrl.newPage)
  const store = await currentStore(req.payload, req.user)
  if (!store || !permissions?.collections?.pages?.create) {
    return (
      <div className="te-page">
        <EmptyState
          action={<ButtonLink href={adminUrl.pages}>Back to pages</ButtonLink>}
          icon="pages"
          title="You can’t create pages here"
        >
          Pages are created by the store’s owner, managers and content editors.
        </EmptyState>
      </div>
    )
  }
  return (
    <div className="te-page te-page--narrow">
      <PageHeader
        eyebrow={
          <a className="te-link" href={adminUrl.pages}>
            ← Pages
          </a>
        }
        subtitle="Pick the kind of page. You can change it later in the editor’s sidebar."
        title="Create a page"
      />
      <ul className="te-choice-grid" role="list">
        {(Object.keys(PAGE_TEMPLATES) as PageTemplate[]).map((key) => {
          const info = PAGE_TEMPLATES[key]
          return (
            <li key={key}>
              <a className={`te-choice te-choice--${key}`} href={adminUrl.createPage(key)}>
                <span aria-hidden className="te-choice__icon">
                  <Icon name={info.icon} size={22} />
                </span>
                <span className="te-choice__title">{info.label} page</span>
                <span className="te-choice__text">{WHEN[key]}</span>
                <span className="te-choice__examples">
                  {EXAMPLES[key].map((example) => (
                    <span className="te-chip-static" key={example}>
                      {example}
                    </span>
                  ))}
                </span>
                <span className="te-choice__cta">
                  Start a {info.label.toLowerCase()} page <Icon name="arrowRight" size={16} />
                </span>
              </a>
            </li>
          )
        })}
      </ul>
      <p className="te-muted te-small">
        Every page starts as a draft. Nothing reaches {store.name}’s store until you publish or
        schedule it.
      </p>
    </div>
  )
}

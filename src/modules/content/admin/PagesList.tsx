import type { ListViewServerProps } from 'payload'

import { adminUrl } from '@/admin/paths'
import { currentStore } from '@/admin/store'
import {
  ButtonLink,
  EmptyState,
  PAGE_TEMPLATES,
  PageHeader,
  StatusBadge,
  TemplateBadge,
} from '@/admin/ui'
import { formatDate, formatDateAndTime, formatRelative } from '@/lib/dates'

import {
  pageAddress,
  storePageOverview,
  type PageRow,
  type PageStatus,
} from '../services/pageOverview'
import { PageRowActions } from './PageRowActions'
import { PagesToolbar } from './PagesToolbar'

const TABS: { key: 'all' | PageStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'published', label: 'Published' },
  { key: 'changed', label: 'Unpublished changes' },
  { key: 'draft', label: 'Drafts' },
  { key: 'scheduled', label: 'Scheduled' },
]

const SORTS = {
  updated: (a: PageRow, b: PageRow) => b.updatedAt.localeCompare(a.updatedAt),
  title: (a: PageRow, b: PageRow) => a.title.localeCompare(b.title, 'en-IN'),
  published: (a: PageRow, b: PageRow) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''),
} as const

const PERIOD_DAYS: Record<string, number> = { today: 1, week: 7, month: 30 }

const param = (value: unknown) =>
  typeof value === 'string' ? value : Array.isArray(value) ? String(value[0] ?? '') : ''

/**
 * Pages (docs/screens `cms-pages`): every content page of the store with what state it is in,
 * who changed it last and when it went or goes live. Replaces Payload's generic list for pages;
 * editing stays in Payload's editor (Page builder).
 */
export async function PagesList({ payload, user, searchParams, permissions }: ListViewServerProps) {
  const store = await currentStore(payload, user)
  if (!store) {
    return (
      <div className="te-page">
        <EmptyState icon="store" title="No store selected">
          Choose a store in the menu to see its pages.
        </EmptyState>
      </div>
    )
  }
  const rows = await storePageOverview(payload, store.id, user)
  const canCreate = Boolean(permissions?.collections?.pages?.create)
  const canDelete = Boolean(permissions?.collections?.pages?.delete)

  const q = param(searchParams?.q).trim().toLowerCase()
  const tab = (param(searchParams?.status) || 'all') as 'all' | PageStatus
  const template = param(searchParams?.template)
  const editor = param(searchParams?.editor)
  const period = param(searchParams?.period)
  const sortKey = (param(searchParams?.sort) || 'updated') as keyof typeof SORTS

  const now = new Date()
  const since = PERIOD_DAYS[period] ? now.getTime() - PERIOD_DAYS[period]! * 86_400_000 : null
  const matching = rows.filter(
    (row) =>
      (!q || row.title.toLowerCase().includes(q) || row.slug.includes(q)) &&
      (!template || row.template === template) &&
      (!editor || row.lastEditedBy === editor) &&
      (!since || Date.parse(row.updatedAt) >= since),
  )
  const counts = Object.fromEntries(
    TABS.map(({ key }) => [
      key,
      key === 'all' ? matching.length : matching.filter((row) => row.status === key).length,
    ]),
  ) as Record<(typeof TABS)[number]['key'], number>
  const shown = matching
    .filter((row) => tab === 'all' || row.status === tab)
    .sort(SORTS[sortKey] ?? SORTS.updated)
  const editors = [
    ...new Set(rows.map((row) => row.lastEditedBy).filter((name): name is string => Boolean(name))),
  ].sort()
  const filtered = Boolean(q || template || editor || period || tab !== 'all')

  const tabHref = (key: string) => {
    const next = new URLSearchParams()
    for (const [name, value] of Object.entries({
      q,
      template,
      editor,
      period,
      sort: sortKey === 'updated' ? '' : sortKey,
    })) {
      if (value) next.set(name, value)
    }
    if (key !== 'all') next.set('status', key)
    const query = next.toString()
    return query ? `${adminUrl.pages}?${query}` : adminUrl.pages
  }

  return (
    <div className="te-page">
      <PageHeader
        actions={
          canCreate ? (
            <ButtonLink href={adminUrl.newPage} icon="plus" variant="primary">
              Create page
            </ButtonLink>
          ) : null
        }
        eyebrow={store.name}
        subtitle="Manage your storefront pages, landing pages and policies."
        title="Pages"
      />

      <nav aria-label="Page status" className="te-tabs te-tabs--underline">
        {TABS.map(({ key, label }) => (
          <a
            aria-current={tab === key ? 'page' : undefined}
            className={`te-tab${tab === key ? ' te-tab--active' : ''}`}
            href={tabHref(key)}
            key={key}
          >
            {label} <span className="te-tab__count">{counts[key]}</span>
          </a>
        ))}
      </nav>

      <PagesToolbar
        editors={editors}
        initial={{ q, template, editor, period, sort: sortKey }}
        templates={Object.entries(PAGE_TEMPLATES).map(([value, info]) => ({
          value,
          label: info.label,
        }))}
      />

      {rows.length === 0 ? (
        <EmptyState
          action={
            canCreate ? (
              <ButtonLink href={adminUrl.newPage} icon="plus" variant="primary">
                Create page
              </ButtonLink>
            ) : null
          }
          icon="pages"
          title="No pages found"
        >
          Create your first page to start building your storefront.
        </EmptyState>
      ) : shown.length === 0 ? (
        <EmptyState
          action={
            filtered ? (
              <ButtonLink href={adminUrl.pages} variant="secondary">
                Clear filters
              </ButtonLink>
            ) : null
          }
          icon="search"
          title="No pages match these filters"
        >
          Try another word, or clear the filters to see all {rows.length} pages.
        </EmptyState>
      ) : (
        <div className="te-card te-card--table">
          <div className="te-table-scroll">
            <table className="te-table te-table--rows">
              <thead>
                <tr>
                  <th scope="col">Page</th>
                  <th scope="col">Template</th>
                  <th scope="col">Status</th>
                  <th scope="col">Last modified</th>
                  <th scope="col">Published</th>
                  <th className="te-table__actions" scope="col">
                    <span className="te-visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <a className="te-table__primary" href={adminUrl.page(row.id)}>
                        {row.title}
                      </a>
                      <div className="te-table__secondary te-mono">{pageAddress(row.slug)}</div>
                    </td>
                    <td>
                      <TemplateBadge template={row.template} />
                    </td>
                    <td>
                      <StatusBadge status={row.status} />
                      {row.scheduled ? (
                        <div className="te-table__secondary">
                          {row.scheduled.type === 'publish' ? 'Goes live' : 'Unpublishes'}{' '}
                          {formatDateAndTime(row.scheduled.at)}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <div>{formatRelative(row.updatedAt)}</div>
                      <div className="te-table__secondary">
                        {row.lastEditedBy ? `by ${row.lastEditedBy}` : '—'}
                      </div>
                    </td>
                    <td>
                      {row.publishedAt ? (
                        formatDate(row.publishedAt)
                      ) : (
                        <span className="te-muted">—</span>
                      )}
                    </td>
                    <td className="te-table__actions">
                      <PageRowActions
                        canDelete={canDelete}
                        canDuplicate={canCreate}
                        editHref={adminUrl.page(row.id)}
                        id={row.id}
                        live={row.status === 'published' || row.status === 'changed'}
                        storeHref={
                          store.storeUrl ? `${store.storeUrl}${pageAddress(row.slug)}` : undefined
                        }
                        title={row.title}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="te-card__footnote">
            Showing {shown.length} of {rows.length} pages · every save keeps a version you can
            restore
          </p>
        </div>
      )}
    </div>
  )
}

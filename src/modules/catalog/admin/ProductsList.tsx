import type { ListViewServerProps } from 'payload'

import { CATALOG_WRITE, storeSessionOf } from '@/access'
import { adminUrl } from '@/admin/paths'
import { currentStore, storeRolesOf } from '@/admin/store'
import { ButtonLink, EmptyState, PageHeader } from '@/admin/ui'
import { ListToolbar } from '@/admin/ui/ListToolbar'
import { Pager } from '@/admin/ui/Pager'
import { calendarDaysBetween, formatDayMonth, formatTime } from '@/lib/dates'

import {
  productFiltersFrom,
  productRows,
  productsWhere,
  storeCategories,
} from '../services/productList'
import { ProductsTable, type ProductTableRow } from './ProductsTable'

const PAGE_SIZE = 25
const KEYS = ['tab', 'q', 'category', 'stock', 'page'] as const
const TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'draft', label: 'Draft' },
  { key: 'archived', label: 'Archived' },
] as const

const param = (value: unknown) =>
  typeof value === 'string' ? value : Array.isArray(value) ? String(value[0] ?? '') : ''

/** "Today 09:12", "Yesterday", "28 Sep" */
function updatedText(at: string, now = new Date()) {
  const days = calendarDaysBetween(new Date(at), now)
  if (days === 0) return `Today ${formatTime(at)}`
  if (days === 1) return 'Yesterday'
  return formatDayMonth(at)
}

/**
 * Products (docs/screens/vendor-cms.md `cms-products`): the whole catalogue, found by name, SKU
 * or model number, with price range and stock, and bulk actions. Replaces Payload's list.
 */
export async function ProductsList({ payload, user, searchParams }: ListViewServerProps) {
  const store = await currentStore(payload, user)
  if (!store) {
    return (
      <div className="te-page">
        <EmptyState icon="store" title="No store selected">
          Choose a store in the menu to see its products.
        </EmptyState>
      </div>
    )
  }
  const session = storeSessionOf(user)
  const canWrite = session
    ? session.mode === 'manage'
    : storeRolesOf(user, store.id).some((role) => CATALOG_WRITE.includes(role))

  const params = new URLSearchParams()
  for (const key of KEYS) {
    const value = param(searchParams?.[key])
    if (value) params.set(key, value)
  }
  const filters = productFiltersFrom(params)
  const page = Math.max(1, Number(params.get('page')) || 1)

  const [where, everyTab, categories] = await Promise.all([
    productsWhere(payload, store.id, filters),
    productsWhere(payload, store.id, filters, { ignoreTab: true }),
    storeCategories(payload, store.id),
  ])
  const counts = Object.fromEntries(
    await Promise.all(
      TABS.map(async ({ key }) => {
        const { totalDocs } = await payload.count({
          collection: 'products',
          where: key === 'all' ? everyTab : { and: [everyTab, { status: { equals: key } }] },
          overrideAccess: true,
        })
        return [key, totalDocs] as const
      }),
    ),
  ) as Record<string, number>
  const { docs, totalDocs } = await payload.find({
    collection: 'products',
    where,
    sort: '-updatedAt',
    depth: 1,
    limit: PAGE_SIZE,
    page,
    overrideAccess: true,
    select: {
      title: true,
      modelNumber: true,
      primaryCategory: true,
      gallery: true,
      price: true,
      purchaseMode: true,
      status: true,
      updatedAt: true,
    },
  })
  const rows: ProductTableRow[] = (await productRows(payload, store.id, docs)).map((row) => ({
    ...row,
    href: adminUrl.doc('products', row.id),
    updated: updatedText(row.updatedAt),
  }))

  const categoryOptions = categories.nodes.map((node) => ({
    value: node.id,
    label: categories.pathOf(node.id).join(' › '),
  }))
  categoryOptions.sort((a, b) => a.label.localeCompare(b.label))
  const tabHref = (key: string) => {
    const next = new URLSearchParams(params)
    next.delete('page')
    if (key === 'all') next.delete('tab')
    else next.set('tab', key)
    const query = next.toString()
    return query ? `${adminUrl.collection('products')}?${query}` : adminUrl.collection('products')
  }
  const exportParams = new URLSearchParams(params)
  exportParams.delete('page')
  exportParams.set('store', store.id)
  const allowed = store.maxProducts

  return (
    <div className="te-page">
      <PageHeader
        actions={
          <>
            {canWrite ? (
              <ButtonLink href={adminUrl.import} icon="upload">
                Import
              </ButtonLink>
            ) : null}
            <ButtonLink
              href={`/api/admin/v1/imports/export/products?${exportParams}`}
              icon="external"
            >
              Export
            </ButtonLink>
            {canWrite ? (
              <ButtonLink href={adminUrl.create('products')} icon="plus" variant="primary">
                Add product
              </ButtonLink>
            ) : null}
          </>
        }
        eyebrow={store.name}
        subtitle={`${store.productsCount.toLocaleString('en-IN')} products${
          allowed
            ? ` · ${allowed.toLocaleString('en-IN')} allowed on ${store.planName ?? 'your plan'}`
            : ''
        }`}
        title="Products"
      />
      <nav aria-label="Product status" className="te-tabs te-tabs--underline">
        {TABS.map(({ key, label }) => (
          <a
            aria-current={filters.tab === key ? 'page' : undefined}
            className={`te-tab${filters.tab === key ? ' te-tab--active' : ''}`}
            href={tabHref(key)}
            key={key}
          >
            {label}{' '}
            <span className="te-tab__count">{(counts[key] ?? 0).toLocaleString('en-IN')}</span>
          </a>
        ))}
      </nav>
      <ListToolbar
        filters={[
          {
            key: 'category',
            label: 'Category',
            anyLabel: 'Category: all',
            options: categoryOptions,
          },
          {
            key: 'stock',
            label: 'Stock',
            anyLabel: 'Stock: all',
            options: [
              { value: 'in', label: 'In stock' },
              { value: 'low', label: 'Low stock' },
              { value: 'out', label: 'Out of stock' },
            ],
          },
        ]}
        initial={{ q: filters.q, category: filters.category, stock: filters.stock }}
        searchLabel="Search products"
        searchPlaceholder="Search title, SKU or model no."
      />
      {rows.length ? (
        <ProductsTable
          canWrite={canWrite}
          categories={categoryOptions}
          rows={rows}
          storeId={store.id}
        />
      ) : (
        <EmptyState icon="products" title={counts.all ? 'No products match' : 'No products yet'}>
          {counts.all
            ? 'Try another tab or clear the search and filters.'
            : 'Add your first product, or bring many in at once with Import.'}
        </EmptyState>
      )}
      <Pager
        base={adminUrl.collection('products')}
        page={page}
        pageSize={PAGE_SIZE}
        params={params}
        total={totalDocs}
      />
    </div>
  )
}

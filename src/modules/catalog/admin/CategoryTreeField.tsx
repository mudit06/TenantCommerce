import type { UIFieldServerComponent } from 'payload'

import { CATALOG_WRITE, storeSessionOf } from '@/access'
import { adminUrl } from '@/admin/paths'
import { currentStore, storeRolesOf } from '@/admin/store'
import { Card } from '@/admin/ui'

import { categoryTree } from '../services/categoryTree'
import { CategoryTree } from './CategoryTree'

/**
 * The tree beside a category's form (docs/screens `cms-categories`), so moving between
 * categories and reordering them never leaves the editor.
 */
export const CategoryTreeField: UIFieldServerComponent = async ({ id, req }) => {
  const store = await currentStore(req.payload, req.user)
  if (!store) return null
  const session = storeSessionOf(req.user)
  const canWrite = session
    ? session.mode === 'manage'
    : storeRolesOf(req.user, store.id).some((role) => CATALOG_WRITE.includes(role))
  const nodes = await categoryTree(req.payload, store.id)
  return (
    <Card
      actions={
        <a className="te-link te-small" href={adminUrl.collection('categories')}>
          All categories
        </a>
      }
      className="te-card--sidebar te-category-tree-card"
      title="Tree"
    >
      <CategoryTree canWrite={canWrite} currentId={id ? String(id) : undefined} nodes={nodes} />
    </Card>
  )
}

/** "View on store" under a category's form: its live address on the store's own domain. */
export const CategoryStoreLink: UIFieldServerComponent = async ({ data, req }) => {
  const store = await currentStore(req.payload, req.user)
  const path = (data?.breadcrumbs as { url?: string | null }[] | undefined)?.at(-1)?.url
  if (!store?.storeUrl || !path) return null
  return (
    <p className="te-category-store-link">
      <a className="te-link" href={`${store.storeUrl}${path}`} rel="noreferrer" target="_blank">
        View on store ↗
      </a>
      <span className="te-muted te-small"> {path}</span>
    </p>
  )
}

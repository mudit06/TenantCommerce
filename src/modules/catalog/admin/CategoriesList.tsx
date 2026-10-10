import type { ListViewServerProps } from 'payload'

import { CATALOG_WRITE, storeSessionOf } from '@/access'
import { adminUrl } from '@/admin/paths'
import { currentStore, storeRolesOf } from '@/admin/store'
import { ButtonLink, Card, EmptyState, PageHeader } from '@/admin/ui'

import { categoryTree } from '../services/categoryTree'
import { CategoryTree } from './CategoryTree'

/**
 * Categories (docs/screens/vendor-cms.md `cms-categories`): the tree shoppers browse beside the
 * chosen category's form. This list shows the tree; a category opens beside it.
 */
export async function CategoriesList({ payload, user }: ListViewServerProps) {
  const store = await currentStore(payload, user)
  if (!store) {
    return (
      <div className="te-page">
        <EmptyState icon="store" title="No store selected">
          Choose a store in the menu to see its categories.
        </EmptyState>
      </div>
    )
  }
  const session = storeSessionOf(user)
  const canWrite = session
    ? session.mode === 'manage'
    : storeRolesOf(user, store.id).some((role) => CATALOG_WRITE.includes(role))
  const nodes = await categoryTree(payload, store.id)
  return (
    <div className="te-page">
      <PageHeader
        actions={
          canWrite ? (
            <ButtonLink href={adminUrl.create('categories')} icon="plus" variant="primary">
              Add category
            </ButtonLink>
          ) : null
        }
        eyebrow={store.name}
        subtitle={`${nodes.length} ${nodes.length === 1 ? 'category' : 'categories'}`}
        title="Categories"
      />
      {nodes.length ? (
        <div className="te-grid te-grid--1-2">
          <Card title="Tree">
            <CategoryTree canWrite={canWrite} nodes={nodes} />
          </Card>
          <Card>
            <EmptyState icon="categories" title="Choose a category">
              Its name, parent, attribute set, images and search details open here. Each category
              uses one attribute set: products in it get those specification fields, and the store’s
              filters come from the same set.
            </EmptyState>
          </Card>
        </div>
      ) : (
        <EmptyState icon="categories" title="No categories yet">
          Add the categories shoppers browse, for example Faucets › Basin mixers. Give each one an
          attribute set so its products get the right specification fields.
        </EmptyState>
      )}
    </div>
  )
}

import type { ListViewServerProps, Payload, UIFieldServerComponent } from 'payload'

import { CATALOG_WRITE, idOf, storeSessionOf } from '@/access'
import { adminUrl } from '@/admin/paths'
import { currentStore, storeRolesOf } from '@/admin/store'
import { ButtonLink, Card, EmptyState, PageHeader } from '@/admin/ui'

// Attribute sets (docs/screens/vendor-cms.md `cms-attributes`): the store's sets beside the
// chosen set's fields, as in the wireframe.

async function setSummaries(payload: Payload, tenantId: string) {
  const scope = { tenant: { equals: tenantId } }
  const [{ docs: sets }, { docs: categories }] = await Promise.all([
    payload.find({
      collection: 'attribute-sets',
      where: scope,
      sort: 'name',
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { name: true, attributes: true },
    }),
    payload.find({
      collection: 'categories',
      where: scope,
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { attributeSet: true },
    }),
  ])
  return sets.map((set) => ({
    id: String(set.id),
    name: set.name,
    fields: (set.attributes ?? []).length,
    categories: categories.filter((c) => idOf(c.attributeSet) === String(set.id)).length,
  }))
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

function SetsCard({
  sets,
  currentId,
}: {
  sets: Awaited<ReturnType<typeof setSummaries>>
  currentId?: string
}) {
  return (
    <Card className="te-card--sidebar te-sets-card" title="Sets">
      {sets.length ? (
        <ul className="te-sets">
          {sets.map((set) => (
            <li key={set.id}>
              <a
                aria-current={set.id === currentId ? 'page' : undefined}
                className={`te-sets__item${set.id === currentId ? ' te-sets__item--current' : ''}`}
                href={adminUrl.doc('attribute-sets', set.id)}
              >
                <b>{set.name}</b>
                <span className="te-muted te-small">
                  {plural(set.fields, 'field')} · {plural(set.categories, 'category', 'categories')}
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="te-muted te-small">No sets yet.</p>
      )}
    </Card>
  )
}

/** The sets beside a set's form (sidebar column, put on the left by the styles). */
export const AttributeSetsNav: UIFieldServerComponent = async ({ id, req }) => {
  const store = await currentStore(req.payload, req.user)
  if (!store) return null
  const sets = await setSummaries(req.payload, store.id)
  return <SetsCard currentId={id ? String(id) : undefined} sets={sets} />
}

/** The Attribute sets list: the sets, and a set opens beside them. */
export async function AttributeSetsList({ payload, user }: ListViewServerProps) {
  const store = await currentStore(payload, user)
  if (!store) {
    return (
      <div className="te-page">
        <EmptyState icon="store" title="No store selected">
          Choose a store in the menu to see its attribute sets.
        </EmptyState>
      </div>
    )
  }
  const session = storeSessionOf(user)
  const canWrite = session
    ? session.mode === 'manage'
    : storeRolesOf(user, store.id).some((role) => CATALOG_WRITE.includes(role))
  const sets = await setSummaries(payload, store.id)
  return (
    <div className="te-page">
      <PageHeader
        actions={
          canWrite ? (
            <ButtonLink href={adminUrl.create('attribute-sets')} icon="plus">
              New attribute set
            </ButtonLink>
          ) : null
        }
        eyebrow={store.name}
        subtitle="The specification fields for each kind of product"
        title="Attribute sets"
      />
      <div className="te-grid te-grid--sets">
        <SetsCard sets={sets} />
        <Card>
          <EmptyState
            icon="attributes"
            title={sets.length ? 'Choose a set' : 'No attribute sets yet'}
          >
            A set lists the specification fields for one kind of product, with their type and unit.
            “Filter” adds a field to the store’s filters; “Finish option” makes each value its own
            SKU with price and stock. Locks, faucets and kurtas each get their own fields with no
            code change.
          </EmptyState>
        </Card>
      </div>
    </div>
  )
}

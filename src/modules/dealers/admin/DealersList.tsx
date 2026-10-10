import type { ListViewServerProps, Where } from 'payload'

import { idOf, STORE_ADMIN, storeSessionOf } from '@/access'
import { adminUrl } from '@/admin/paths'
import { currentStore, storeRolesOf } from '@/admin/store'
import { ButtonLink, Card, EmptyState, PageHeader } from '@/admin/ui'
import { DealerMap } from '@/admin/ui/DealerMap'
import { ListToolbar } from '@/admin/ui/ListToolbar'
import { Pager } from '@/admin/ui/Pager'

import { ShownSwitch } from './ShownSwitch'

const PAGE_SIZE = 50
const TYPES = [
  { value: 'dealer', label: 'Dealer' },
  { value: 'distributor', label: 'Distributor' },
  { value: 'showroom', label: 'Showroom' },
  { value: 'service-centre', label: 'Service centre' },
  { value: 'experience-centre', label: 'Experience centre' },
]
const TYPE_LABEL = new Map(TYPES.map((t) => [t.value, t.label]))

const param = (value: unknown) =>
  typeof value === 'string' ? value : Array.isArray(value) ? String(value[0] ?? '') : ''

/** "+91 20xx xxx 412": the list shows enough of a number to recognise it */
const masked = (phone: string | null | undefined) => {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 10 ? `+91 ${digits.slice(-10, -8)}xx xxx ${digits.slice(-3)}` : phone
}

/**
 * Dealers (docs/screens/vendor-cms.md `cms-dealers`): the dealer locator's list with a Shown
 * switch per row, the map of everyone pinned, and the chosen dealer's address and position.
 * Replaces Payload's list.
 */
export async function DealersList({ payload, user, searchParams }: ListViewServerProps) {
  const store = await currentStore(payload, user)
  if (!store) {
    return (
      <div className="te-page">
        <EmptyState icon="store" title="No store selected">
          Choose a store in the menu to see its dealers.
        </EmptyState>
      </div>
    )
  }
  const session = storeSessionOf(user)
  const canWrite = session
    ? session.mode === 'manage'
    : storeRolesOf(user, store.id).some((role) => STORE_ADMIN.includes(role))
  const params = new URLSearchParams()
  for (const key of ['q', 'type', 'open', 'page']) {
    const value = param(searchParams?.[key])
    if (value) params.set(key, value)
  }
  const q = params.get('q')?.trim() ?? ''
  const type = params.get('type') ?? ''
  const page = Math.max(1, Number(params.get('page')) || 1)
  const where: Where = {
    and: [
      { tenant: { equals: store.id } },
      ...(type ? [{ type: { equals: type } }] : []),
      ...(q
        ? [{ or: [{ name: { like: q } }, { city: { like: q } }, { pincode: { like: q } }] }]
        : []),
    ],
  }
  const [{ docs, totalDocs }, all] = await Promise.all([
    payload.find({
      collection: 'dealers',
      where,
      sort: 'name',
      depth: 0,
      limit: PAGE_SIZE,
      page,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'dealers',
      where: { tenant: { equals: store.id } },
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { name: true, city: true, location: true, isActive: true },
    }),
  ])
  const cities = new Set(all.docs.map((d) => d.city?.trim().toLowerCase()).filter(Boolean)).size
  const pinned = all.docs
    .filter((d) => d.isActive !== false && Array.isArray(d.location) && d.location.length === 2)
    .map((d) => ({
      id: String(d.id),
      name: d.name,
      latitude: d.location![1],
      longitude: d.location![0],
      href: `${adminUrl.collection('dealers')}?open=${d.id}`,
    }))
  const openId = params.get('open')
  const open =
    (openId &&
      (docs.find((d) => String(d.id) === openId) ??
        (await payload
          .findByID({ collection: 'dealers', id: openId, depth: 0, overrideAccess: true })
          .then((d) => (idOf(d.tenant) === store.id ? d : null))
          .catch(() => null)))) ||
    null
  const hrefWith = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    const query = next.toString()
    return query ? `${adminUrl.collection('dealers')}?${query}` : adminUrl.collection('dealers')
  }

  return (
    <div className="te-page">
      <PageHeader
        actions={
          canWrite ? (
            <>
              <ButtonLink href={adminUrl.import} icon="upload">
                Import CSV
              </ButtonLink>
              <ButtonLink href={adminUrl.create('dealers')} icon="plus" variant="primary">
                Add dealer
              </ButtonLink>
            </>
          ) : null
        }
        eyebrow={store.name}
        subtitle={`${all.docs.length.toLocaleString('en-IN')} dealers in ${cities.toLocaleString('en-IN')} ${cities === 1 ? 'city' : 'cities'}`}
        title="Dealers"
      />
      <div className="te-grid te-grid--2-1">
        <div className="te-stack">
          <ListToolbar
            filters={[{ key: 'type', label: 'Type', anyLabel: 'Type: all', options: TYPES }]}
            initial={{ q, type }}
            searchLabel="Search dealers"
            searchPlaceholder="Name, city or pincode"
          />
          {docs.length ? (
            <div className="te-card te-card--table">
              <div className="te-table-scroll">
                <table className="te-table te-table--rows te-table--clickable te-table--compact">
                  <thead>
                    <tr>
                      <th>Dealer</th>
                      <th>Type</th>
                      <th>City</th>
                      <th>Pincode</th>
                      <th>Shown</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docs.map((dealer) => (
                      <tr
                        className={
                          open && String(open.id) === String(dealer.id)
                            ? 'te-row--selected'
                            : undefined
                        }
                        key={dealer.id}
                      >
                        <td>
                          <a
                            className="te-table__primary"
                            href={hrefWith({ open: String(dealer.id) })}
                          >
                            {dealer.name}
                          </a>
                          <div className="te-muted te-small">{masked(dealer.phone)}</div>
                        </td>
                        <td>{TYPE_LABEL.get(dealer.type) ?? dealer.type}</td>
                        <td>{dealer.city}</td>
                        <td className="te-mono">{dealer.pincode}</td>
                        <td>
                          <ShownSwitch
                            canWrite={canWrite}
                            id={String(dealer.id)}
                            name={dealer.name}
                            shown={dealer.isActive !== false}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState
              icon="dealers"
              title={all.docs.length ? 'No dealers match' : 'No dealers yet'}
            >
              {all.docs.length
                ? 'Try another type or clear the search.'
                : 'Add dealers one by one, or bring a whole list in with Import CSV.'}
            </EmptyState>
          )}
          <Pager
            base={adminUrl.collection('dealers')}
            page={page}
            pageSize={PAGE_SIZE}
            params={params}
            total={totalDocs}
          />
        </div>
        <div className="te-stack">
          <Card className="te-card--flush" title="Map">
            <DealerMap
              label={`Map of ${pinned.length} dealers shown on the store`}
              points={pinned}
              selectedId={open ? String(open.id) : null}
            />
            {all.docs.length > pinned.length ? (
              <p className="te-muted te-small te-map-note">
                {all.docs.length - pinned.length} without a position or hidden are not pinned.
              </p>
            ) : null}
          </Card>
          {open ? (
            <Card
              actions={
                canWrite ? (
                  <a className="te-link te-small" href={adminUrl.doc('dealers', open.id)}>
                    Edit dealer
                  </a>
                ) : null
              }
              title={open.name}
            >
              <dl className="te-dl">
                <dt>Address</dt>
                <dd>{[open.address, open.city, open.pincode].filter(Boolean).join(', ')}</dd>
                <dt>Latitude</dt>
                <dd className="te-mono">{open.location?.[1]?.toFixed(4) ?? '—'}</dd>
                <dt>Longitude</dt>
                <dd className="te-mono">{open.location?.[0]?.toFixed(4) ?? '—'}</dd>
                <dt>Phone</dt>
                <dd>{open.phone}</dd>
                {open.hours ? (
                  <>
                    <dt>Hours</dt>
                    <dd>{open.hours}</dd>
                  </>
                ) : null}
              </dl>
              <p className="te-muted te-small">
                Filled from the pincode. Drag the pin on the dealer’s page to correct it.
              </p>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}

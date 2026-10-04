import type { PayloadRequest, ServerProps } from 'payload'

import { ENQUIRY_WORK, TENANT_ROLE_LABELS } from '@/access'
import { adminUrl } from '@/admin/paths'
import { currentStore, storeRolesOf } from '@/admin/store'
import { Icon } from '@/admin/ui/icons'

import { AdminSearch } from './AdminSearch'

/**
 * A store CMS's top bar from the wireframe, next to Payload's breadcrumbs and account avatar:
 * search (Ctrl K), View store, a bell with the new enquiries, and who is signed in. Nothing in
 * the platform panel.
 */
export async function StoreTopBar({ req }: ServerProps & { req?: PayloadRequest }) {
  if (!req?.user) return null
  const store = await currentStore(req.payload, req.user)
  if (!store) return null
  const roles = storeRolesOf(req.user, store.id)
  const seesEnquiries =
    store.features.includes('enquiries') && roles.some((role) => ENQUIRY_WORK.includes(role))
  const newEnquiries = seesEnquiries
    ? (
        await req.payload.count({
          collection: 'enquiries',
          where: { and: [{ tenant: { equals: store.id } }, { status: { equals: 'new' } }] },
          overrideAccess: true,
        })
      ).totalDocs
    : 0
  const name =
    ('name' in req.user && typeof req.user.name === 'string' && req.user.name) || req.user.email
  const roleLabel = roles.map((role) => TENANT_ROLE_LABELS[role] ?? role).join(', ')

  const targets = [
    { label: 'Products', href: adminUrl.collection('products') },
    ...(seesEnquiries ? [{ label: 'Enquiries', href: adminUrl.collection('enquiries') }] : []),
    { label: 'Pages', href: adminUrl.pages },
  ]
  const bellLabel =
    newEnquiries > 0
      ? `${newEnquiries} new ${newEnquiries === 1 ? 'enquiry' : 'enquiries'}`
      : 'No new enquiries'

  return (
    <div className="te-topbar">
      <AdminSearch targets={targets} />
      {store.storeUrl ? (
        <a className="te-topbar__btn" href={store.storeUrl} rel="noreferrer" target="_blank">
          <Icon name="external" size={15} />
          <span>View store</span>
        </a>
      ) : null}
      {seesEnquiries ? (
        <a
          aria-label={bellLabel}
          className="te-topbar__bell"
          href={`${adminUrl.collection('enquiries')}?where[status][equals]=new`}
          title={bellLabel}
        >
          <Icon name="bell" size={17} />
          {newEnquiries > 0 ? (
            <span className="te-topbar__badge">{newEnquiries > 99 ? '99+' : newEnquiries}</span>
          ) : null}
        </a>
      ) : null}
      <a className="te-topbar__who" href={`${adminUrl.dashboard}/account`}>
        {name}
        {roleLabel ? <span className="te-topbar__role"> · {roleLabel}</span> : null}
      </a>
    </div>
  )
}

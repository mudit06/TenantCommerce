import type { PayloadRequest, ServerProps } from 'payload'

import { adminUrl } from '@/admin/paths'
import { currentStore, storeRolesOf } from '@/admin/store'
import { Icon } from '@/admin/ui/icons'

/**
 * A banner on every page of a store's CMS while shoppers can't buy (docs/screens/vendor-cms.md
 * "Rules that apply to every screen"): the store is suspended, or maintenance mode is on. Failing
 * payment or WhatsApp connectors join this when connectors are built.
 */
export async function StoreBanner({ req }: ServerProps & { req?: PayloadRequest }) {
  if (!req?.user) return null
  const store = await currentStore(req.payload, req.user)
  if (!store) return null
  if (store.status === 'suspended') {
    return (
      <div className="te-store-banner te-store-banner--danger" role="alert">
        <Icon name="alert" size={16} />
        <p>
          <strong>This store is suspended.</strong> Shoppers see “store unavailable” and changes are
          paused. Contact the platform team to restore it.
        </p>
      </div>
    )
  }
  const { docs } = await req.payload.find({
    collection: 'site-settings',
    where: { tenant: { equals: store.id } },
    select: { maintenanceMode: true },
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })
  if (!docs[0]?.maintenanceMode) return null
  const roles = storeRolesOf(req.user, store.id)
  return (
    <div className="te-store-banner te-store-banner--warning" role="status">
      <Icon name="wrench" size={16} />
      <p>
        <strong>Maintenance mode is on.</strong> Shoppers see “store unavailable” until it is
        switched off.
      </p>
      {roles.some((role) => role === 'owner' || role === 'manager') ? (
        <a className="te-store-banner__action" href={adminUrl.collection('site-settings')}>
          Open settings
        </a>
      ) : null}
    </div>
  )
}

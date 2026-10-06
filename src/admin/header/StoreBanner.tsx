import type { PayloadRequest, ServerProps } from 'payload'

import { adminUrl } from '@/admin/paths'
import { currentStore, storeRolesOf } from '@/admin/store'
import { Icon } from '@/admin/ui/icons'

/**
 * A banner on every page of a store's CMS while shoppers can't buy (docs/screens/vendor-cms.md
 * "Rules that apply to every screen"): the store is suspended, or maintenance mode is on. Failing
 * payment or WhatsApp connectors show here too, since they stop money or messages.
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
  const { docs: failing } = await req.payload.find({
    collection: 'connector-configs',
    where: {
      and: [
        { tenant: { equals: store.id } },
        { enabled: { equals: true } },
        { 'health.failingSince': { exists: true } },
        { 'health.failingSince': { not_equals: null } },
      ],
    },
    select: { provider: true, kind: true, health: true },
    depth: 0,
    limit: 5,
    overrideAccess: true,
  })
  const broken = failing[0]
  if (broken) {
    const payment = broken.kind === 'payment'
    const href = payment ? adminUrl.payments : adminUrl.messaging
    const canFix = storeRolesOf(req.user, store.id).includes('owner')
    return (
      <div className="te-store-banner te-store-banner--danger" role="alert">
        <Icon name="alert" size={16} />
        <p>
          <strong>
            {payment ? 'Razorpay webhooks are failing.' : 'WhatsApp order updates are failing.'}
          </strong>{' '}
          {payment
            ? 'Paid orders are being checked every 15 minutes until this is fixed.'
            : 'Shoppers get their updates by email until this is fixed.'}
        </p>
        {canFix ? (
          <a className="te-store-banner__action" href={href}>
            Fix in {payment ? 'Payments' : 'WhatsApp and SMS'}
          </a>
        ) : null}
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

import type { UIFieldServerComponent } from 'payload'

import { isPlatformStaff } from '@/access'
import { adminUrl } from '@/admin/paths'
import { primaryHostOf } from '@/admin/store'
import { Card, Pill } from '@/admin/ui'
import { Icon } from '@/admin/ui/icons'
import { connectorOverview } from '@/connectors'
import { formatRelative } from '@/lib/dates'
import { hasOwnVendorUI } from '@/storefront/registry'

/**
 * Store health on the vendor overview (docs/screens/super-admin.md `sa-vendor`): the last order,
 * the payment connector's state, the primary domain and which storefront design it runs.
 */
export const StoreHealth: UIFieldServerComponent = async ({ id, req }) => {
  if (!id || !isPlatformStaff(req.user)) return null
  const tenantId = String(id)
  const [{ tenant, connectors }, host, lastOrder] = await Promise.all([
    connectorOverview(req.payload, tenantId),
    primaryHostOf(req.payload, tenantId),
    req.payload.find({
      collection: 'orders',
      where: {
        and: [{ tenant: { equals: tenantId } }, { status: { not_equals: 'pending' } }],
      },
      sort: '-placedAt',
      limit: 1,
      depth: 0,
      overrideAccess: true,
      select: { placedAt: true },
    }),
  ])
  const razorpay = connectors.find((row) => row.provider.key === 'razorpay')
  const failing = connectors.filter((row) => row.connected && row.health?.failingSince)
  const placedAt = lastOrder.docs[0]?.placedAt

  return (
    <Card className="te-card--sidebar" title="Store health">
      <ul className="te-health">
        <li>
          <Icon name="cart" size={14} />
          <span>Last order</span>
          <b>{placedAt ? formatRelative(placedAt) : 'No orders yet'}</b>
        </li>
        <li>
          <Icon name="card" size={14} />
          <a href={adminUrl.vendor(tenantId, 'connectors')}>
            Razorpay{razorpay?.mode ? `, ${razorpay.mode}` : ''}
          </a>
          {!razorpay?.connected ? (
            <Pill tone="neutral">Not connected</Pill>
          ) : razorpay.health?.failingSince ? (
            <Pill tone="danger">Webhook failing</Pill>
          ) : (
            <Pill tone="success">Working</Pill>
          )}
        </li>
        {failing
          .filter((row) => row.provider.key !== 'razorpay')
          .map((row) => (
            <li key={row.provider.key}>
              <Icon name="alert" size={14} />
              <a href={adminUrl.vendor(tenantId, 'connectors')}>{row.provider.label}</a>
              <Pill tone="danger">Failing</Pill>
            </li>
          ))}
        <li>
          <Icon name="globe" size={14} />
          <a href={adminUrl.vendor(tenantId, 'domains')}>Primary domain</a>
          <span className="te-mono te-small">{host ?? 'None yet'}</span>
        </li>
        <li>
          <Icon name="layout" size={14} />
          <span>Storefront design</span>
          <span className="te-mono te-small">
            {hasOwnVendorUI(tenant.slug) ? `vendors/${tenant.slug}` : 'Shared default kit'}
          </span>
        </li>
      </ul>
    </Card>
  )
}

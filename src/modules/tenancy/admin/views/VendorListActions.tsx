import type { ServerProps } from 'payload'

import { isPlatformStaff, isSuperAdmin } from '@/access'
import { adminUrl } from '@/admin/paths'

import { TENANT_STATUSES } from '../../constants'

/** Above the Vendors list: status tabs with counts and New vendor (docs/screens "All vendors"). */
export async function VendorListActions({ payload, user, searchParams }: ServerProps) {
  if (!isPlatformStaff(user)) return null
  const counts = await Promise.all(
    TENANT_STATUSES.map(async (status) => {
      const { totalDocs } = await payload.count({
        collection: 'tenants',
        where: { status: { equals: status } },
        overrideAccess: true,
      })
      return [status, totalDocs] as const
    }),
  )
  const all = counts.reduce((sum, [, n]) => sum + n, 0)
  const where = searchParams?.where as { status?: { equals?: string } } | undefined
  const current = where?.status?.equals ?? 'all'
  const tab = (key: string, label: string, count: number) => (
    <a
      aria-current={current === key ? 'page' : undefined}
      className={`te-tab${current === key ? ' te-tab--active' : ''}`}
      href={key === 'all' ? adminUrl.vendors : `${adminUrl.vendors}?where[status][equals]=${key}`}
      key={key}
    >
      {label} <span className="te-tab__count">{count}</span>
    </a>
  )
  return (
    <div className="te-list-actions">
      <nav aria-label="Store status" className="te-tabs">
        {tab('all', 'All', all)}
        {counts.map(([status, count]) =>
          tab(status, status.charAt(0).toUpperCase() + status.slice(1), count),
        )}
      </nav>
      {isSuperAdmin(user) ? (
        <a className="btn btn--style-primary btn--size-small te-btn" href={adminUrl.newVendor}>
          New vendor
        </a>
      ) : null}
    </div>
  )
}

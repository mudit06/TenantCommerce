import { getTenantFromCookie } from '@payloadcms/plugin-multi-tenant/utilities'
import { headers as nextHeaders } from 'next/headers'
import type { BeforeListTableServerPropsOnly, Where } from 'payload'

import { adminUrl } from '@/admin/paths'

import { ENQUIRY_TABS } from '../constants'

const statusFilter = (statuses: readonly string[]) =>
  statuses.map((status, i) => `where[status][in][${i}]=${encodeURIComponent(status)}`).join('&')

/** New · In progress · Closed above the inbox, with counts for the selected store. */
export async function EnquiryTabs({ payload, user, searchParams }: BeforeListTableServerPropsOnly) {
  const tenantId = getTenantFromCookie(await nextHeaders(), 'text')
  const params = (searchParams ?? {}) as Record<string, string | string[] | undefined>
  const active = Object.entries(params)
    .filter(([key]) => key.startsWith('where[status][in]'))
    .flatMap(([, value]) => value ?? [])
    .sort()
    .join(',')

  const tabs = await Promise.all(
    ENQUIRY_TABS.map(async (tab) => {
      const where: Where = {
        and: [
          { status: { in: [...tab.statuses] } },
          ...(tenantId ? [{ tenant: { equals: tenantId } }] : []),
        ],
      }
      const { totalDocs } = await payload.count({
        collection: 'enquiries',
        where,
        user,
        overrideAccess: false,
      })
      return { ...tab, count: totalDocs, isActive: active === [...tab.statuses].sort().join(',') }
    }),
  )
  const base = adminUrl.collection('enquiries')
  return (
    <nav className="te-tabs" aria-label="Enquiry status" style={{ marginBottom: 16 }}>
      <a className={`te-tab${active === '' ? ' te-tab--active' : ''}`} href={base}>
        All
      </a>
      {tabs.map((tab) => (
        <a
          key={tab.label}
          className={`te-tab${tab.isActive ? ' te-tab--active' : ''}`}
          href={`${base}?${statusFilter(tab.statuses)}`}
          aria-current={tab.isActive ? 'page' : undefined}
        >
          {tab.label} <span className="te-tab__count">{tab.count}</span>
        </a>
      ))}
    </nav>
  )
}

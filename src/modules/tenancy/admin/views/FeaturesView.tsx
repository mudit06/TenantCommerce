import type { DocumentViewServerProps } from 'payload'

import { isPlatformStaff, isSuperAdmin } from '@/access'
import { adminUrl } from '@/admin/paths'
import { Card, Notice } from '@/admin/ui'
import { formatDate } from '@/lib/dates'

import { getTenantFeatures } from '../../services/features'
import { FeatureTable } from './FeatureTable'
import { PresetActions } from './PresetActions'

const ALWAYS_ON = [
  'Catalog',
  'Cart and checkout',
  'Orders and GST invoices',
  'CMS pages',
  'Customers',
  'CSV import',
]

/** docs/screens/super-admin.md "Vendor features". */
export async function FeaturesView({ initPageResult, routeSegments }: DocumentViewServerProps) {
  const { req } = initPageResult
  const tenantId = String(initPageResult.docID ?? routeSegments[2] ?? '')
  if (!isPlatformStaff(req.user) || !tenantId) return <Notice tone="danger">Our team only.</Notice>
  const { tenant, plan, states } = await getTenantFeatures(req.payload, tenantId)
  const canEdit = isSuperAdmin(req.user)
  const sections = [
    { title: 'MVP features', group: 'mvp' },
    { title: 'Growth features, Phase 1', group: 'growth' },
    { title: 'Phase 2 modules', group: 'phase-2' },
  ] as const

  return (
    <div className="te-page te-page--tab">
      <div className="te-toolbar">
        <span>
          {plan ? `${plan.name} plan` : 'No plan'} · industry preset{' '}
          <strong>{(tenant.industry ?? []).join(' + ') || 'none'}</strong>
          {tenant.presetAppliedAt ? ` applied on ${formatDate(tenant.presetAppliedAt)}` : ''}
        </span>
        <span className="te-toolbar__actions">
          {canEdit ? <PresetActions tenantId={tenantId} /> : null}
          <a className="te-link" href={adminUrl.plans}>
            Compare plans
          </a>
        </span>
      </div>
      <Card title="Always on">
        <p className="te-always-on">
          {ALWAYS_ON.map((name) => (
            <span key={name}>✓ {name}</span>
          ))}
        </p>
      </Card>
      {sections.map((section) => (
        <FeatureTable
          canEdit={canEdit}
          canEditCaps={canEdit}
          key={section.group}
          states={states.filter((state) => state.group === section.group)}
          tenantId={tenantId}
          title={section.title}
        />
      ))}
      <p className="te-muted te-small">
        Saved changes reach the live store right away. Switching off keeps the data. Locked rows are
        not in the plan (change it from Billing) or arrive in Phase 2.
      </p>
    </div>
  )
}

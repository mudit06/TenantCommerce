import type { DocumentViewServerProps } from 'payload'

import { isPlatformStaff, isSuperAdmin } from '@/access'
import { Notice } from '@/admin/ui'

import { loadBillingPanel } from '../billingData'
import { BillingPanel } from './BillingPanel'

/** Vendor detail, Billing tab. */
export async function BillingView({ initPageResult }: DocumentViewServerProps) {
  const { req } = initPageResult
  const tenantId = initPageResult.docID ? String(initPageResult.docID) : null
  if (!isPlatformStaff(req.user) || !tenantId) return <Notice tone="danger">Our team only.</Notice>
  const { docs } = await req.payload.find({
    collection: 'subscriptions',
    where: { tenant: { equals: tenantId } },
    depth: 1,
    limit: 1,
    overrideAccess: true,
  })
  const sub = docs[0]
  const data = sub ? await loadBillingPanel(req.payload, sub) : null
  return (
    <div className="te-page te-page--tab">
      {data ? (
        <BillingPanel canEdit={isSuperAdmin(req.user)} data={data} />
      ) : (
        <Notice tone="warning">
          This store has no subscription. Onboarding creates one; check the audit log.
        </Notice>
      )}
    </div>
  )
}

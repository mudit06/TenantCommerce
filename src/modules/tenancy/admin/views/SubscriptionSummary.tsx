import type { ServerProps } from 'payload'

import { isPlatformStaff } from '@/access'
import { Figure } from '@/admin/ui'
import { formatINR, formatINRCompact } from '@/lib/money'

import { summarizeBilling } from '../../services/billing'

/** Figures above the Subscriptions list (docs/screens/super-admin.md "Subscriptions"). */
export async function SubscriptionSummary({ payload, user }: ServerProps) {
  if (!isPlatformStaff(user)) return null
  const { docs } = await payload.find({
    collection: 'subscriptions',
    depth: 1,
    pagination: false,
    overrideAccess: true,
  })
  const summary = summarizeBilling(
    docs.map((sub) => ({ ...sub, plan: typeof sub.plan === 'object' ? sub.plan : null })),
    new Date(),
  )
  return (
    <div className="te-figures te-figures--list">
      <Figure
        hint={`${summary.payingCount} paying ${summary.payingCount === 1 ? 'vendor' : 'vendors'}, before GST`}
        label="MRR"
        value={formatINRCompact(summary.mrrMinor)}
      />
      <Figure
        hint={`${summary.trialsEndingSoon} end this week`}
        label="On trial"
        value={summary.trialCount}
      />
      <Figure
        hint={`${formatINR(summary.pastDueOutstandingMinor)} incl. GST`}
        label="Past due"
        tone={summary.pastDueCount ? 'danger' : undefined}
        value={summary.pastDueCount}
      />
      <Figure
        hint={`${formatINR(summary.renewingSoonMinor)} incl. GST`}
        label="Renewing in 7 days"
        value={summary.renewingSoonCount}
      />
    </div>
  )
}

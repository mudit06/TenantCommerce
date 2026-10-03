import type { UIFieldServerComponent } from 'payload'

import { isPlatformStaff, isSuperAdmin } from '@/access'

import { loadBillingPanel } from '../billingData'
import { BillingPanel } from './BillingPanel'

/** The subscription edit page shows the same billing panel as the vendor's Billing tab. */
export const SubscriptionBillingField: UIFieldServerComponent = async ({ id, req }) => {
  if (!id || !isPlatformStaff(req.user)) return null
  const sub = await req.payload
    .findByID({ collection: 'subscriptions', id, depth: 1, overrideAccess: true })
    .catch(() => null)
  const data = sub ? await loadBillingPanel(req.payload, sub) : null
  return data ? <BillingPanel canEdit={isSuperAdmin(req.user)} data={data} /> : null
}

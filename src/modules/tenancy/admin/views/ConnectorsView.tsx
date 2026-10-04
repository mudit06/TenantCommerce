import type { DocumentViewServerProps } from 'payload'

import { isPlatformStaff } from '@/access'
import { CONNECTOR_PROVIDERS } from '@/connectors/core/providers'
import { Card, Notice, Pill } from '@/admin/ui'

const SPRINT: Record<string, string> = {
  razorpay: 'Sprint 4 (cart, checkout, Razorpay and COD)',
  manual: 'Sprint 5 (orders and manual shipping)',
  shiprocket: 'Sprint 6 (Shiprocket)',
  'meta-whatsapp': 'Sprint 7 (WhatsApp and SMS)',
  msg91: 'Sprint 7 (WhatsApp and SMS)',
}

/**
 * Vendor detail, Connectors tab. What the plan allows today; connection health, keys
 * ("Saved · hidden") and the per-store allow switch arrive with each connector's sprint.
 */
export async function ConnectorsView({ initPageResult }: DocumentViewServerProps) {
  const { req } = initPageResult
  const tenantId = initPageResult.docID ? String(initPageResult.docID) : null
  if (!isPlatformStaff(req.user) || !tenantId) return <Notice tone="danger">Our team only.</Notice>
  const tenant = await req.payload.findByID({
    collection: 'tenants',
    id: tenantId,
    depth: 1,
    overrideAccess: true,
  })
  const plan = typeof tenant.plan === 'object' ? tenant.plan : null
  const allowed = (plan?.allowedConnectors ?? []) as string[]
  const kinds = [
    { kind: 'payment', title: 'Payments' },
    { kind: 'shipping', title: 'Shipping' },
    { kind: 'messaging', title: 'Order updates to shoppers' },
  ] as const
  return (
    <div className="te-page te-page--tab">
      <Notice tone="info">
        Vendors connect providers with their own keys from their CMS, so money goes straight to the
        vendor. Secrets are encrypted and never shown here. Cash on delivery is a feature switch
        (Features tab).
      </Notice>
      {kinds.map(({ kind, title }) => (
        <Card key={kind} title={title}>
          <table className="te-table">
            <tbody>
              {CONNECTOR_PROVIDERS.filter((provider) => provider.kind === kind).map((provider) => (
                <tr key={provider.key}>
                  <td className="te-strong">{provider.label}</td>
                  <td>
                    {allowed.includes(provider.key) ? (
                      <Pill tone="success">Allowed by {plan?.name} plan</Pill>
                    ) : (
                      <Pill>Not in plan</Pill>
                    )}
                  </td>
                  <td className="te-muted te-small">Setup and health: {SPRINT[provider.key]}</td>
                </tr>
              ))}
              {kind === 'messaging' ? (
                <tr>
                  <td className="te-strong">Email</td>
                  <td>
                    <Pill tone="info">Platform Resend</Pill>
                  </td>
                  <td className="te-muted te-small">
                    Sent in the store’s name from the platform account
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Card>
      ))}
    </div>
  )
}

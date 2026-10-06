import type { AdminViewServerProps } from 'payload'

import { adminUrl } from '@/admin/paths'
import { AdminScreen } from '@/admin/ui/AdminScreen'
import { Card, Notice, PageHeader, Pill, Row, Rows } from '@/admin/ui'
import { getCodRules } from '@/modules/content'

import { connectorOverview } from '../core/service'
import { CodRulesForm } from './CodRulesForm'
import { ConnectorForm } from './ConnectorForm'
import { connectorStatus, healthLine, keysScreenContext, OwnerOnly, problemLine } from './storeView'

/** Payments (docs/screens/vendor-cms.md `cms-payments`): the vendor's own Razorpay and COD rules. */
export async function PaymentsView(view: AdminViewServerProps) {
  return (
    <AdminScreen view={view}>
      <Payments view={view} />
    </AdminScreen>
  )
}

async function Payments({ view }: { view: AdminViewServerProps }) {
  const { req } = view.initPageResult
  const { store, canSee, canEdit } = await keysScreenContext(view, adminUrl.payments)
  if (!store || !canSee) return <OwnerOnly />
  const [{ connectors }, cod] = await Promise.all([
    connectorOverview(req.payload, store.id),
    getCodRules(req.payload, store.id),
  ])
  const razorpay = connectors.find((row) => row.provider.key === 'razorpay')!
  const shiprocket = connectors.find((row) => row.provider.key === 'shiprocket')!
  const whatsapp = connectors.find((row) => row.provider.key === 'meta-whatsapp')!
  const codSwitchedOn = store.features.includes('cod')
  const problem = problemLine(razorpay)

  return (
    <div className="te-page">
      {razorpay.health?.failingSince ? (
        <Notice tone="danger">
          <strong>Razorpay webhooks are failing.</strong> Paid orders are being checked every 15
          minutes until this is fixed.
        </Notice>
      ) : null}
      <PageHeader
        eyebrow="Store"
        subtitle="Payments go to your own Razorpay account"
        title="Payments"
      />
      <div className="te-grid te-grid--2-1">
        <Card title="Razorpay">
          {razorpay.availability.allowed ? (
            <ConnectorForm
              canEdit={canEdit}
              fields={razorpay.provider.fields}
              hasModes
              healthLine={healthLine(razorpay)}
              label="Razorpay"
              mode={razorpay.mode}
              problem={
                problem && razorpay.health?.failingSince
                  ? `${problem}. In Razorpay, open Settings, Webhooks, copy the secret, and paste it below.`
                  : problem
              }
              providerKey="razorpay"
              savedSecrets={razorpay.savedSecrets}
              status={connectorStatus(razorpay)}
              tenantId={store.id}
              values={razorpay.publicValues}
              webhookEvents={razorpay.provider.webhookEvents}
              webhookUrl={razorpay.webhookUrl}
            />
          ) : (
            <Notice tone="info">
              Online payments aren’t switched on for this store. Your platform contact can switch
              Razorpay on when your plan allows it.
            </Notice>
          )}
        </Card>
        <div className="te-stack">
          {codSwitchedOn ? (
            <Card title="Cash on delivery">
              <CodRulesForm canEdit={canEdit} rules={cod} tenantId={store.id} />
              <div className="te-switch-row te-switch-row--locked">
                <span className="te-switch">
                  <input aria-label="Confirm COD orders on WhatsApp" disabled type="checkbox" />
                  <span className="te-switch__track" />
                </span>
                <span>Confirm COD orders on WhatsApp before dispatch</span>
                <Pill>Phase 2</Pill>
              </div>
            </Card>
          ) : (
            <Card title="Cash on delivery">
              <p className="te-muted">
                Cash on delivery isn’t switched on for this store. Ask your platform contact.
              </p>
            </Card>
          )}
          <Card title="Prepaid discount">
            <div className="te-switch-row te-switch-row--locked">
              <span className="te-switch">
                <input aria-label="Prepaid discount" disabled type="checkbox" />
                <span className="te-switch__track" />
              </span>
              <span>Give 2% off when paying online</span>
              <Pill>Phase 2</Pill>
            </div>
            <p className="te-field-help">Reduces COD returns.</p>
          </Card>
          <Card title="Other providers">
            <Rows>
              <Row
                aside={
                  <Pill tone={connectorStatus(shiprocket).tone}>
                    {connectorStatus(shiprocket).label}
                  </Pill>
                }
                primary="Shiprocket shipping"
              />
              <Row
                aside={
                  <Pill tone={connectorStatus(whatsapp).tone}>
                    {connectorStatus(whatsapp).label}
                  </Pill>
                }
                href={adminUrl.messaging}
                primary="WhatsApp order updates"
              />
            </Rows>
            <p className="te-field-help">
              Your platform contact can switch these on when your plan allows.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}

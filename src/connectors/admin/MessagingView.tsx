import type { AdminViewServerProps } from 'payload'

import { adminUrl } from '@/admin/paths'
import { AdminScreen } from '@/admin/ui/AdminScreen'
import { ButtonLink, Card, Empty, Notice, PageHeader, Pill, Row, Rows } from '@/admin/ui'
import { formatDate, formatDateAndTime } from '@/lib/dates'
import { TemplatesCard } from '@/modules/notifications/admin/TemplatesCard'

import { connectorOverview } from '../core/service'
import { ConnectorForm } from './ConnectorForm'
import { connectorStatus, healthLine, keysScreenContext, OwnerOnly, problemLine } from './storeView'

const QUALITY: Record<string, { tone: 'success' | 'warning' | 'danger'; label: string }> = {
  green: { tone: 'success', label: 'High' },
  high: { tone: 'success', label: 'High' },
  yellow: { tone: 'warning', label: 'Medium' },
  medium: { tone: 'warning', label: 'Medium' },
  red: { tone: 'danger', label: 'Low' },
  low: { tone: 'danger', label: 'Low' },
}

/**
 * WhatsApp and SMS (docs/screens/vendor-cms.md `cms-messaging`): the vendor's own WhatsApp
 * number that order updates go out from. SMS comes later (mudit, 6 October 2026: email and
 * WhatsApp first); email is sent by the platform in the store's name.
 */
export async function MessagingView(view: AdminViewServerProps) {
  return (
    <AdminScreen view={view}>
      <Messaging view={view} />
    </AdminScreen>
  )
}

async function Messaging({ view }: { view: AdminViewServerProps }) {
  const { req } = view.initPageResult
  const { store, canSee, canEdit } = await keysScreenContext(view, adminUrl.messaging)
  if (!store || !canSee) return <OwnerOnly />
  const { connectors } = await connectorOverview(req.payload, store.id)
  const whatsapp = connectors.find((row) => row.provider.key === 'meta-whatsapp')!
  const details = (whatsapp.health?.details ?? {}) as Record<string, string | null>
  const quality = details.quality ? QUALITY[details.quality] : undefined
  const problem = problemLine(whatsapp)

  return (
    <div className="te-page">
      <PageHeader
        actions={
          <ButtonLink href={adminUrl.notifications} icon="bell" size="small">
            Order update settings
          </ButtonLink>
        }
        eyebrow="Store"
        subtitle="Your own WhatsApp number, billed to you by Meta"
        title="WhatsApp and SMS"
      />
      <div className="te-grid te-grid--2-1">
        <div className="te-stack">
          <Card title="WhatsApp Business">
            {whatsapp.availability.allowed ? (
              <div className="te-stack">
                {whatsapp.connected ? (
                  <dl className="te-dl">
                    <dt>Sending number</dt>
                    <dd className="te-strong">
                      {details.displayPhone ?? whatsapp.publicValues.displayPhone ?? '—'}
                    </dd>
                    <dt>Display name</dt>
                    <dd>
                      {details.verifiedName ?? '—'}
                      {details.nameStatus ? (
                        <span className="te-muted te-small">
                          {' '}
                          · {details.nameStatus.toLowerCase().replace(/_/g, ' ')}
                        </span>
                      ) : null}
                    </dd>
                    <dt>Quality rating</dt>
                    <dd>{quality ? <Pill tone={quality.tone}>{quality.label}</Pill> : '—'}</dd>
                    <dt>Messaging limit</dt>
                    <dd>{details.messagingLimit ?? '—'}</dd>
                    <dt>Set up</dt>
                    <dd>
                      {whatsapp.connectedByName ?? 'Your team'}
                      {whatsapp.connectedAt ? `, ${formatDate(whatsapp.connectedAt)}` : ''}
                    </dd>
                  </dl>
                ) : (
                  <Notice tone="info">
                    Your platform contact sets this up with you: a Meta business account, your
                    WhatsApp number and a system user token. Then order updates go out from your own
                    number.
                  </Notice>
                )}
                <ConnectorForm
                  canEdit={canEdit}
                  fields={whatsapp.provider.fields}
                  healthLine={healthLine(whatsapp)}
                  dashboardName="Meta"
                  label="WhatsApp"
                  mode={whatsapp.mode}
                  problem={problem}
                  providerKey="meta-whatsapp"
                  savedSecrets={whatsapp.savedSecrets}
                  status={connectorStatus(whatsapp)}
                  tenantId={store.id}
                  values={whatsapp.publicValues}
                  webhookEvents={whatsapp.provider.webhookEvents}
                  webhookToken={whatsapp.webhookToken}
                  webhookTokenLabel="Verify token for Meta’s webhook setup"
                  webhookUrl={whatsapp.webhookUrl}
                />
                <div className="te-switch-row te-switch-row--locked">
                  <span>Connect WhatsApp in one click</span>
                  <Pill>Phase 2</Pill>
                </div>
              </div>
            ) : (
              <Notice tone="info">
                WhatsApp order updates aren’t switched on for this store. Your platform contact can
                switch them on when your plan allows.
              </Notice>
            )}
          </Card>
          {whatsapp.availability.allowed ? (
            <TemplatesCard
              canEdit={canEdit}
              connected={whatsapp.connected}
              payload={req.payload}
              storeId={store.id}
            />
          ) : null}
        </div>
        <div className="te-stack">
          <Card title="SMS">
            <p className="te-muted">
              SMS order updates come later. Until then shoppers get their updates by WhatsApp and
              email.
            </p>
          </Card>
          <Card title="Email">
            <Rows>
              <Row
                aside={<Pill tone="success">Ready</Pill>}
                primary="Sent by the platform"
                secondary={`In ${store.name}’s name`}
              />
            </Rows>
          </Card>
          <Card title="Recent problems">
            {whatsapp.health?.lastErrorAt ? (
              <Rows>
                <Row
                  primary={whatsapp.health.lastError ?? 'WhatsApp failed'}
                  secondary={formatDateAndTime(whatsapp.health.lastErrorAt)}
                />
              </Rows>
            ) : (
              <Empty>No problems.</Empty>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

import type { DocumentViewServerProps } from 'payload'
import type { ReactNode } from 'react'

import { isPlatformStaff, isSuperAdmin } from '@/access'
import { adminUrl } from '@/admin/paths'
import { Card, Notice, Pill } from '@/admin/ui'
import { connectorOverview, type ConnectorSummary } from '@/connectors'
import { formatDate, formatDateAndTime } from '@/lib/dates'
import { formatINR } from '@/lib/money'
import { getCodRules } from '@/modules/content'

import { ConnectorAllowSwitch } from './ConnectorAllowSwitch'

function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="te-dl te-small">
      {rows.map(([label, value]) => (
        <div className="te-dl__pair" key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function ProviderHeader({
  summary,
  tenantId,
  canEdit,
}: {
  summary: ConnectorSummary
  tenantId: string
  canEdit: boolean
}) {
  return (
    <div className="te-connector__head">
      <span className="te-strong">{summary.provider.label}</span>
      <span className="te-connector__mode">
        <ConnectorAllowSwitch
          allowed={!summary.availability.blocked}
          available={summary.availability.available}
          canEdit={canEdit}
          inPlan={summary.availability.inPlan}
          label={summary.provider.label}
          providerKey={summary.provider.key}
          tenantId={tenantId}
        />
      </span>
    </div>
  )
}

function health(summary: ConnectorSummary): [string, ReactNode][] {
  if (!summary.connected) {
    return [
      [
        'Status',
        <span className="te-muted" key="s">
          Not connected by the vendor yet
        </span>,
      ],
    ]
  }
  const h = summary.health
  const secretRows: [string, ReactNode][] = summary.savedSecrets.map((key) => [
    summary.provider.fields.find((field) => field.key === key)?.label ?? key,
    'Encrypted, never shown',
  ])
  return [
    [
      'Connected by',
      `${summary.connectedByName ?? 'Unknown'}${summary.connectedAt ? `, ${formatDate(summary.connectedAt)}` : ''}`,
    ],
    ...(summary.mode && summary.provider.hasModes
      ? ([
          [
            'Mode',
            <Pill key="m" tone={summary.mode === 'live' ? 'success' : 'warning'}>
              {summary.mode === 'live' ? 'Live' : 'Test'}
            </Pill>,
          ],
        ] as [string, ReactNode][])
      : []),
    ...Object.entries(summary.maskedPublic)
      .filter(([key]) => /id$/i.test(key))
      .map(([key, value]): [string, ReactNode] => [
        summary.provider.fields.find((field) => field.key === key)?.label ?? key,
        <span className="te-mono" key={key}>
          {value}
        </span>,
      ]),
    ...secretRows,
    ['Last webhook OK', h?.lastWebhookOkAt ? formatDateAndTime(h.lastWebhookOkAt) : '—'],
    [
      'Last test',
      h?.lastTestAt
        ? `${formatDateAndTime(h.lastTestAt)} · ${h.lastTestOk ? 'keys accepted' : 'failed'}`
        : 'Not tested',
    ],
    [
      'Last error',
      h?.lastErrorAt ? (
        <span className="te-text--danger">
          {formatDateAndTime(h.lastErrorAt)} {h.lastError}
        </span>
      ) : (
        '—'
      ),
    ],
  ]
}

/**
 * Vendor detail, Connectors tab (docs/screens/super-admin.md `sa-vendor-connectors`): which
 * providers the store may use (our "Allowed" switch, capped by the plan) and their health. The
 * vendor enters its own keys; secrets are never shown here.
 */
export async function ConnectorsView({ initPageResult }: DocumentViewServerProps) {
  const { req } = initPageResult
  const tenantId = initPageResult.docID ? String(initPageResult.docID) : null
  if (!isPlatformStaff(req.user) || !tenantId) return <Notice tone="danger">Our team only.</Notice>
  const canEdit = isSuperAdmin(req.user)
  const [{ tenant, connectors }, cod] = await Promise.all([
    connectorOverview(req.payload, tenantId),
    getCodRules(req.payload, tenantId),
  ])
  const byKey = Object.fromEntries(connectors.map((row) => [row.provider.key, row]))
  const razorpay = byKey.razorpay!
  const shiprocket = byKey.shiprocket!
  const whatsapp = byKey['meta-whatsapp']!
  const sms = byKey.msg91!
  const failing = connectors.filter((row) => row.health?.failingSince)
  const details = (whatsapp.health?.details ?? {}) as Record<string, string | null>
  const codOn = (tenant.enabledFeatures ?? []).includes('cod')
  const rupees = (minor: number | null) => (minor === null ? null : formatINR(minor))

  return (
    <div className="te-page te-page--tab">
      {failing.map((row) => (
        <Notice key={row.provider.key} tone="danger">
          <strong>
            {row.provider.label} failing since {formatDateAndTime(row.health!.failingSince!)}.
          </strong>{' '}
          {row.health?.lastError}{' '}
          {row.provider.kind === 'payment'
            ? 'Orders paid since then are being settled by the 15-minute reconciliation job.'
            : ''}
        </Notice>
      ))}
      <div className="te-grid te-grid--halves">
        <Card title="Payments">
          <ProviderHeader canEdit={canEdit} summary={razorpay} tenantId={tenantId} />
          <Facts rows={health(razorpay)} />
          <hr className="te-hr" />
          <div className="te-connector__head">
            <span className="te-strong">Cash on delivery</span>
            <a className="te-link te-small" href={adminUrl.vendor(tenantId, 'features')}>
              Feature switch, see Features
            </a>
          </div>
          <p className="te-muted te-small">
            {!codOn
              ? 'Switched off for this store.'
              : cod.codEnabled
                ? `Vendor rules: ${[
                    cod.codMinOrderMinor !== null || cod.codMaxOrderMinor !== null
                      ? `orders ${rupees(cod.codMinOrderMinor) ?? 'any'} to ${rupees(cod.codMaxOrderMinor) ?? 'any amount'}`
                      : 'any order value',
                    cod.codFeeMinor ? `${rupees(cod.codFeeMinor)} fee` : 'no fee',
                  ].join(', ')}, only in zones that allow COD.`
                : 'Switched on by us; the vendor hasn’t offered it to shoppers yet.'}
          </p>
        </Card>
        <div className="te-stack">
          <Card title="Shipping">
            <div className="te-connector__head">
              <span className="te-strong">Manual shipping</span>
              <Pill tone="success">Always on</Pill>
            </div>
            <p className="te-muted te-small">
              Delivery zones set by the vendor; staff type the courier and tracking number.
            </p>
            <hr className="te-hr" />
            <ProviderHeader canEdit={canEdit} summary={shiprocket} tenantId={tenantId} />
            <p className="te-muted te-small">
              Courier booking, AWB labels, pickups, tracking and the pincode check, on the vendor’s
              own Shiprocket account. Shoppers pay Shiprocket’s live rate at checkout, or the
              vendor’s rate card when Shiprocket can’t answer.
            </p>
            <Facts rows={health(shiprocket)} />
          </Card>
          <Card title="Order updates to shoppers">
            <ProviderHeader canEdit={canEdit} summary={whatsapp} tenantId={tenantId} />
            {whatsapp.connected ? (
              <p className="te-muted te-small">
                Vendor’s own number{' '}
                {details.displayPhone ?? whatsapp.publicValues.displayPhone ?? ''}
                {details.verifiedName ? `, shown as “${details.verifiedName}”` : ''}.
              </p>
            ) : null}
            {details.quality || details.messagingLimit ? (
              <p className="te-chips">
                {details.quality ? (
                  <Pill
                    tone={
                      details.quality === 'green'
                        ? 'success'
                        : details.quality === 'red'
                          ? 'danger'
                          : 'warning'
                    }
                  >
                    Quality{' '}
                    {details.quality === 'green'
                      ? 'high'
                      : details.quality === 'red'
                        ? 'low'
                        : details.quality}
                  </Pill>
                ) : null}
                {details.messagingLimit ? (
                  <Pill tone="success">{details.messagingLimit}</Pill>
                ) : null}
              </p>
            ) : null}
            <Facts rows={health(whatsapp)} />
            <p className="te-muted te-small">
              Offer messages use marketing templates on the vendor’s Meta bill. WhatsApp offers are
              switched on per vendor in the Features tab.
            </p>
            <hr className="te-hr" />
            <ProviderHeader canEdit={canEdit} summary={sms} tenantId={tenantId} />
            <p className="te-muted te-small">
              SMS order updates come later; shoppers get WhatsApp and email meanwhile.
            </p>
            <hr className="te-hr" />
            <div className="te-connector__head">
              <span className="te-strong">Email</span>
              <Pill tone="success">Platform Resend</Pill>
            </div>
            <p className="te-muted te-small">
              Sent in {tenant.name}’s name from the platform account.
            </p>
            <hr className="te-hr" />
            <div className="te-connector__head te-muted">
              <span className="te-strong">Self-serve “Connect WhatsApp”</span>
              <Pill>Phase 2</Pill>
            </div>
            <p className="te-muted te-small">Needs the platform to become a Meta Tech Provider.</p>
          </Card>
        </div>
      </div>
    </div>
  )
}

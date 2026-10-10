import type { ListViewServerProps } from 'payload'

import { idOf, isPlatformStaff, isSuperAdmin } from '@/access'
import { adminUrl } from '@/admin/paths'
import { ButtonLink, Card, EmptyState, PageHeader, Pill } from '@/admin/ui'
import { Icon } from '@/admin/ui/icons'
import { CONNECTOR_PROVIDERS } from '@/connectors'
import { formatINR } from '@/lib/money'
import { FEATURES } from '@/modules/features'
import type { Plan } from '@/payload-types'

import { effectiveStatus } from '../../services/billing'

/** The wireframe's rows: features that are sold together read as one line. */
const FEATURE_ROWS: { label: string; keys: string[] }[] = [
  { label: 'Guest checkout, COD, pincode check', keys: ['guest-checkout', 'cod', 'pincode-check'] },
  { label: 'Enquiries, enquire-only products', keys: ['enquiries', 'enquire-only-products'] },
  {
    label: 'Dealer locator, downloads, product videos',
    keys: ['dealer-locator', 'downloads', 'product-videos'],
  },
  { label: 'WhatsApp button, size guide', keys: ['whatsapp-button', 'size-guide'] },
  { label: 'Schemes and offers, coupons', keys: ['schemes', 'coupons'] },
  { label: 'Wishlist, reviews', keys: ['wishlist', 'reviews'] },
  { label: 'Offer messages, abandoned cart reminders', keys: ['offer-messages', 'abandoned-cart'] },
  { label: 'WhatsApp offers', keys: ['whatsapp-offers'] },
  { label: 'Affiliate program and commissions', keys: ['affiliate'] },
  { label: 'Warranty and service requests', keys: ['warranty', 'service-requests'] },
  { label: 'Spare parts finder, product compare', keys: ['spare-parts', 'compare'] },
  { label: 'Loyalty points', keys: ['loyalty'] },
  { label: 'Multilingual store', keys: ['multilingual'] },
  {
    label: 'Trade accounts: dealers, retailers, wholesalers, interior designers',
    keys: ['b2b'],
  },
  { label: 'Trade schemes, dealer anniversary offers', keys: ['trade-schemes'] },
]

const PHASE = new Map<string, string>(FEATURES.map((f) => [f.key, f.phase]))
const LABEL = new Map<string, string>(FEATURES.map((f) => [f.key, f.label]))

// Every feature appears once: grouped rows first, then any not grouped above
const ROWS = [
  ...FEATURE_ROWS,
  ...FEATURES.filter((f) => !FEATURE_ROWS.some((row) => row.keys.includes(f.key))).map((f) => ({
    label: f.label,
    keys: [f.key],
  })),
]

function Mark({ allowed, of }: { allowed: number; of: number }) {
  if (allowed === of) return <Icon className="te-text--success" name="check" size={15} />
  if (allowed === 0) return <span className="te-muted">—</span>
  return <span className="te-small te-text--warning">{`${allowed} of ${of}`}</span>
}

const limit = (value: number | null | undefined, unit = '') =>
  value === null || value === undefined ? 'No limit' : `${value.toLocaleString('en-IN')}${unit}`

/**
 * Plans (docs/screens/super-admin.md `sa-plans`): each tier's price and limits as a card, and
 * which features and connectors each allows. A plan is a ceiling, not a switch. Replaces
 * Payload's list; Edit plan opens the plan's form.
 */
export async function PlansList({ payload, user }: ListViewServerProps) {
  if (!isPlatformStaff(user)) {
    return (
      <div className="te-page">
        <EmptyState icon="shield" title="Our team only">
          Plans are managed from the platform panel.
        </EmptyState>
      </div>
    )
  }
  const [{ docs: plans }, { docs: tenants }, { docs: subs }] = await Promise.all([
    payload.find({
      collection: 'plans',
      sort: 'sortOrder',
      depth: 0,
      pagination: false,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'tenants',
      where: { status: { not_equals: 'archived' } },
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { plan: true },
    }),
    payload.find({
      collection: 'subscriptions',
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { plan: true, status: true, trialEndsAt: true, currentPeriodEnd: true },
    }),
  ])
  const active = plans
    .filter((plan) => plan.isActive)
    .sort((a, b) => (a.priceMonthly?.amountMinor ?? 0) - (b.priceMonthly?.amountMinor ?? 0))
  const inactive = plans.filter((plan) => !plan.isActive)
  const vendorsOn = (plan: Plan) => tenants.filter((t) => idOf(t.plan) === String(plan.id)).length
  const trialsOn = (plan: Plan) =>
    subs.filter(
      (s) => idOf(s.plan) === String(plan.id) && effectiveStatus(s, new Date()) === 'trialing',
    ).length
  const canEdit = isSuperAdmin(user)

  const allows = (plan: Plan, keys: string[]) =>
    keys.filter((key) => (plan.allowedModules ?? []).includes(key as never)).length

  return (
    <div className="te-page">
      <PageHeader
        actions={
          canEdit ? (
            <ButtonLink href={adminUrl.create('plans')} icon="plus" variant="primary">
              New plan
            </ButtonLink>
          ) : null
        }
        subtitle={`${active.length} active plan${active.length === 1 ? '' : 's'} · prices are before 18% GST`}
        title="Plans"
      />

      {active.length === 0 ? (
        <EmptyState icon="plans" title="No active plans">
          Create the first plan with New plan.
        </EmptyState>
      ) : (
        <div className="te-plan-cards">
          {active.map((plan) => {
            const vendors = vendorsOn(plan)
            const trials = trialsOn(plan)
            return (
              <Card key={plan.id} title={plan.name}>
                <span className="te-mono te-small te-muted">{plan.code}</span>
                <div>
                  <b className="te-plan-cards__price">
                    {formatINR(plan.priceMonthly?.amountMinor ?? 0)}
                  </b>
                  <span className="te-muted te-small"> / month</span>
                  <div className="te-small te-muted">
                    {plan.priceYearly?.amountMinor
                      ? `${formatINR(plan.priceYearly.amountMinor)} / year · plus GST`
                      : 'plus GST'}
                  </div>
                  {plan.introOffer?.price?.amountMinor && plan.introOffer.months ? (
                    <div className="te-small">
                      <Pill tone="info">
                        Starting offer: {formatINR(plan.introOffer.price.amountMinor)} for{' '}
                        {plan.introOffer.months} months
                      </Pill>
                    </div>
                  ) : null}
                </div>
                <dl className="te-plan-cards__limits">
                  <dt>Products</dt>
                  <dd>{limit(plan.limits?.maxProducts)}</dd>
                  <dt>Staff users</dt>
                  <dd>{limit(plan.limits?.maxStaffUsers)}</dd>
                  <dt>Storage</dt>
                  <dd>{limit(plan.limits?.maxStorageGB, ' GB')}</dd>
                  <dt>Orders / month</dt>
                  <dd>{limit(plan.limits?.maxOrdersPerMonth)}</dd>
                </dl>
                <div className="te-plan-cards__foot">
                  <span className="te-small">
                    {vendors} vendor{vendors === 1 ? '' : 's'}
                    {trials ? ` (${trials} on trial)` : ''}
                  </span>
                  <ButtonLink href={adminUrl.doc('plans', plan.id)} size="small">
                    {canEdit ? 'Edit plan' : 'View plan'}
                  </ButtonLink>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {active.length ? (
        <>
          <Card
            actions={
              <span className="te-muted te-small">
                Removing a feature switches it off for the plan’s vendors; their data is kept
              </span>
            }
            className="te-card--flush"
            title="Features allowed"
          >
            <div className="te-table-scroll">
              <table className="te-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>Phase</th>
                    {active.map((plan) => (
                      <th className="te-num" key={plan.id}>
                        {plan.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row) => {
                    const later = row.keys.every((key) => PHASE.get(key) !== 'mvp')
                    return (
                      <tr key={row.label}>
                        <td title={row.keys.map((key) => LABEL.get(key) ?? key).join(', ')}>
                          {row.label}
                        </td>
                        <td>{later ? <Pill tone="neutral">P2</Pill> : 'MVP'}</td>
                        {active.map((plan) => (
                          <td className="te-num" key={plan.id}>
                            <Mark allowed={allows(plan, row.keys)} of={row.keys.length} />
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="te-card--flush" title="Connectors allowed">
            <div className="te-table-scroll">
              <table className="te-table">
                <thead>
                  <tr>
                    <th>Connector</th>
                    <th>Phase</th>
                    {active.map((plan) => (
                      <th className="te-num" key={plan.id}>
                        {plan.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CONNECTOR_PROVIDERS.map((provider) => (
                    <tr key={provider.key}>
                      <td>{provider.label}</td>
                      <td>
                        {provider.phase === 'mvp' ? 'MVP' : <Pill tone="neutral">Later</Pill>}
                      </td>
                      {active.map((plan) => (
                        <td className="te-num" key={plan.id}>
                          <Mark
                            allowed={
                              (plan.allowedConnectors ?? []).includes(provider.key as never) ? 1 : 0
                            }
                            of={1}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : null}

      {inactive.length ? (
        <Card title="Inactive plans">
          <p className="te-muted te-small">
            Plans are switched off, never deleted, because subscriptions point at them.
          </p>
          <ul className="te-rows">
            {inactive.map((plan) => (
              <li className="te-rows__item" key={plan.id}>
                <a className="te-rows__link" href={adminUrl.doc('plans', plan.id)}>
                  <span className="te-rows__primary">{plan.name}</span>
                  <span className="te-rows__aside">{vendorsOn(plan)} vendors</span>
                </a>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  )
}

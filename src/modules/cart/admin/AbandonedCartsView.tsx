import type { ListViewServerProps } from 'payload'

import { storeSessionOf } from '@/access'
import { currentStore, storeRolesOf } from '@/admin/store'
import { EmptyState, Figure, PageHeader } from '@/admin/ui'
import { formatINR } from '@/lib/money'
import { maskedPhone } from '@/modules/notifications'
import { describeCoupon, couponRule } from '@/modules/promotions'
import { featureConfig, getTenantFeatures } from '@/modules/tenancy'
import type { Cart } from '@/payload-types'

import { AbandonedCartsClient, type CartRow } from './AbandonedCartsClient'

type Config = {
  firstAfterMinutes: number
  secondAfterHours: number | null
  secondCoupon: string | null
  channels: ('email' | 'whatsapp')[]
  secondChannels?: ('email' | 'whatsapp')[]
}

const DAY = 86_400_000

const maskedEmail = (email: string) => {
  const [name = '', domain = ''] = email.split('@')
  return `${name.slice(0, 1)}•••@${domain}`
}

const istDay = (d: Date) => d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })

function leftAt(iso: string | null | undefined, now: Date) {
  if (!iso) return '—'
  const d = new Date(iso)
  const time = d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata',
  })
  if (istDay(d) === istDay(now)) return `Today ${time}`
  if (istDay(d) === istDay(new Date(now.getTime() - DAY))) return `Yesterday ${time}`
  const day = d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  })
  return `${day} ${time}`
}

function remindersText(cart: Cart) {
  const reminders = cart.reminders ?? []
  if (!reminders.length) return cart.reminderNote ?? 'Not yet'
  const steps = [...new Set(reminders.map((r) => r.step))].sort()
  const channels = [
    ...new Set(reminders.map((r) => (r.channel === 'email' ? 'email' : 'WhatsApp'))),
  ]
  return `${steps.length > 1 ? '1st and 2nd sent' : '1st sent'} · ${channels.join(', ')}`
}

/**
 * Abandoned carts (docs/screens/vendor-cms.md `cms-abandoned`): the last 7 days' left carts,
 * the reminders sent to shoppers who agreed to offers, what came back, and the reminder settings.
 */
export async function AbandonedCartsView({ payload, user }: ListViewServerProps) {
  const store = await currentStore(payload, user)
  if (!store) {
    return (
      <div className="te-page">
        <EmptyState icon="store" title="No store selected">
          Choose a store in the menu to see its abandoned carts.
        </EmptyState>
      </div>
    )
  }
  const roles = storeRolesOf(user, store.id)
  const session = storeSessionOf(user)
  const canWrite = session
    ? session.mode === 'manage'
    : roles.some((r) => r === 'owner' || r === 'manager')
  const now = new Date()
  const since = new Date(now.getTime() - 7 * DAY).toISOString()
  const scope = { tenant: { equals: store.id } }
  const [carts, config, features, coupons] = await Promise.all([
    payload.find({
      collection: 'carts',
      where: { and: [scope, { abandonedAt: { greater_than: since } }] },
      sort: '-abandonedAt',
      depth: 0,
      limit: 500,
      pagination: false,
      overrideAccess: true,
    }),
    featureConfig<Config>(payload, store.id, 'abandoned-cart'),
    getTenantFeatures(payload, store.id),
    payload.find({
      collection: 'coupons',
      where: { and: [scope, { status: { equals: 'active' } }] },
      sort: 'code',
      depth: 0,
      limit: 100,
      overrideAccess: true,
    }),
  ])

  // Recovered: an order within 7 days of the first reminder (rule 4)
  const orderIds = carts.docs
    .map((c) => (typeof c.convertedOrder === 'object' ? c.convertedOrder?.id : c.convertedOrder))
    .filter((id): id is string => Boolean(id))
    .map(String)
  const { docs: orders } = orderIds.length
    ? await payload.find({
        collection: 'orders',
        where: { and: [scope, { id: { in: orderIds } }] },
        depth: 0,
        pagination: false,
        overrideAccess: true,
        select: { orderNumber: true, placedAt: true, totals: true, status: true },
      })
    : { docs: [] }
  const orderById = new Map(orders.map((o) => [String(o.id), o]))

  const built = carts.docs.map((cart) => {
    const reminders = cart.reminders ?? []
    const first = reminders.find((r) => r.step === 1)
    const orderId =
      typeof cart.convertedOrder === 'object' ? cart.convertedOrder?.id : cart.convertedOrder
    const order = orderId ? orderById.get(String(orderId)) : undefined
    const placed = order?.placedAt ? new Date(order.placedAt).getTime() : null
    const isRecovered =
      Boolean(first?.at && order && placed) &&
      order!.status !== 'cancelled' &&
      placed! >= new Date(first!.at!).getTime() &&
      placed! - new Date(first!.at!).getTime() <= 7 * DAY
    const email = cart.contact?.email
    const phone = cart.contact?.phone
    const noConsent = !reminders.length && /no offer consent/.test(cart.reminderNote ?? '')
    const row: CartRow = {
      id: String(cart.id),
      shopper: noConsent
        ? 'Guest, no consent'
        : email
          ? maskedEmail(email)
          : phone
            ? maskedPhone(phone)
            : '—',
      signedIn: Boolean(cart.customer),
      items: cart.leftSummary ?? `${(cart.items ?? []).length} items`,
      value: cart.leftValueMinor != null ? formatINR(cart.leftValueMinor) : '—',
      leftAt: leftAt(cart.lastActivityAt ?? cart.abandonedAt, now),
      reminders: remindersText(cart),
      result: isRecovered
        ? `Recovered ${order!.orderNumber}`
        : order
          ? `Ordered ${order.orderNumber}`
          : !reminders.length
            ? '—'
            : first?.at && now.getTime() - new Date(first.at).getTime() > 7 * DAY
              ? 'No order'
              : cart.status === 'active' && (cart.items ?? []).length
                ? 'Waiting'
                : 'No order',
      tone: isRecovered ? 'success' : reminders.length ? 'neutral' : 'warning',
    }
    return {
      row,
      reminded: reminders.length > 0,
      recoveredMinor: isRecovered ? (order!.totals?.grandTotalMinor ?? 0) : null,
    }
  })
  const rows = built.map((b) => b.row)
  const reminded = built.filter((b) => b.reminded).length
  const recoveredRows = built.filter((b) => b.recoveredMinor !== null)
  const recovered = recoveredRows.length
  const recoveredSales = recoveredRows.reduce((sum, b) => sum + (b.recoveredMinor ?? 0), 0)

  const whatsappOn = features.enabled.has('whatsapp-offers')
  const couponOptions = coupons.docs.map((c) => ({
    code: c.code,
    label: `${c.code} · ${describeCoupon(couponRule(c))}${c.perCustomerLimit === 1 ? ', single use' : ''}`,
  }))
  const pct = reminded ? `${((recovered / reminded) * 100).toFixed(1)}% of reminded` : 'none yet'

  return (
    <div className="te-page">
      <PageHeader
        eyebrow={store.name}
        subtitle="Last 7 days. Reminders go only to shoppers who agreed to offers on that channel."
        title="Abandoned carts"
      />
      <div className="te-figures te-figures--list">
        <Figure
          hint="with items and a contact"
          label="Abandoned"
          value={carts.docs.length.toLocaleString('en-IN')}
        />
        <Figure hint="agreed to offers" label="Reminded" value={reminded.toLocaleString('en-IN')} />
        <Figure
          hint={pct}
          label="Recovered"
          tone={recovered ? 'success' : undefined}
          value={recovered.toLocaleString('en-IN')}
        />
        <Figure hint="incl. GST" label="Recovered sales" value={formatINR(recoveredSales)} />
      </div>
      <AbandonedCartsClient
        canWrite={canWrite}
        coupons={couponOptions}
        rows={rows}
        settings={{
          firstAfterMinutes: config?.firstAfterMinutes ?? 60,
          secondAfterHours: config?.secondAfterHours ?? null,
          channels: config?.channels ?? ['email', 'whatsapp'],
          secondChannels: config?.secondChannels ?? ['email'],
          secondCoupon: config?.secondCoupon ?? null,
        }}
        storeId={store.id}
        whatsappOn={whatsappOn}
      />
    </div>
  )
}

import type { ListViewServerProps } from 'payload'

import { storeSessionOf } from '@/access'
import { currentStore, storeRolesOf } from '@/admin/store'
import { EmptyState, PageHeader } from '@/admin/ui'
import { formatINR } from '@/lib/money'
import { describeScheme, schemeRule } from '@/modules/promotions'
import { featureConfig, getTenantFeatures } from '@/modules/tenancy'

import { CAMPAIGN_STATUSES } from '../collections/OfferCampaigns'
import { MARKETING_TEMPLATES } from '../marketing'
import { storeFacts } from '../services/store'
import { OfferMessagesClient, type CampaignRow, type SchemeOption } from './OfferMessagesClient'

const when = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Kolkata',
      })
    : '—'

const AUDIENCE: Record<string, string> = {
  all: 'all opted in',
  wishlist: 'wishlisted products',
  lapsed: 'no order in 90 days',
}

/**
 * Offer messages (docs/screens/vendor-cms.md `cms-campaigns`): every message with its results,
 * the editor with the count who will get it, a preview, and the store's offer settings.
 */
export async function OfferMessagesView({ payload, user }: ListViewServerProps) {
  const store = await currentStore(payload, user)
  if (!store) {
    return (
      <div className="te-page">
        <EmptyState icon="store" title="No store selected">
          Choose a store in the menu to see its offer messages.
        </EmptyState>
      </div>
    )
  }
  const roles = storeRolesOf(user, store.id)
  const session = storeSessionOf(user)
  const canWrite = session
    ? session.mode === 'manage'
    : roles.some((r) => r === 'owner' || r === 'manager' || r === 'content-editor')
  const canSettings = session
    ? session.mode === 'manage'
    : roles.some((r) => r === 'owner' || r === 'manager')
  const scope = { tenant: { equals: store.id } }
  const monthStart = new Date(new Date().setDate(1)).toISOString()
  const [campaigns, schemes, facts, features, config, templates, emailIn, phoneIn, unsubscribed] =
    await Promise.all([
      payload.find({
        collection: 'offer-campaigns',
        where: scope,
        sort: '-sendAt',
        depth: 0,
        limit: 100,
        overrideAccess: true,
      }),
      payload.find({
        collection: 'schemes',
        where: { and: [scope, { status: { in: ['draft', 'scheduled', 'live'] } }] },
        sort: 'startsAt',
        depth: 0,
        pagination: false,
        overrideAccess: true,
      }),
      storeFacts(payload, store.id),
      getTenantFeatures(payload, store.id),
      featureConfig<{
        maxPerShopperPerWeek: number
        maxPerShopperPerWeekCap: number
        sendWindow: { start: string; end: string }
      }>(payload, store.id, 'offer-messages'),
      payload.find({
        collection: 'notification-templates',
        where: { and: [scope, { category: { equals: 'marketing' } }] },
        depth: 0,
        pagination: false,
        overrideAccess: true,
      }),
      payload.count({
        collection: 'contact-preferences',
        where: { and: [scope, { 'offers.email.optedIn': { equals: true } }] },
        overrideAccess: true,
      }),
      payload.count({
        collection: 'contact-preferences',
        where: { and: [scope, { 'offers.whatsapp.optedIn': { equals: true } }] },
        overrideAccess: true,
      }),
      payload.count({
        collection: 'contact-preferences',
        where: {
          and: [
            scope,
            {
              or: [
                { 'offers.email.optedOutAt': { greater_than: monthStart } },
                { 'offers.whatsapp.optedOutAt': { greater_than: monthStart } },
              ],
            },
          ],
        },
        overrideAccess: true,
      }),
    ])
  const whatsappOffersOn = features.enabled.has('whatsapp-offers')

  // Results: orders by the people messaged, within 7 days of the message (rule 4)
  const rows: CampaignRow[] = []
  for (const c of campaigns.docs) {
    let orders = 0
    let sales = 0
    if (c.status === 'sent' && c.sentAt) {
      const { docs: logs } = await payload.find({
        collection: 'notification-logs',
        where: {
          and: [scope, { dedupeKey: { like: `offer:${c.id}:` } }, { status: { equals: 'sent' } }],
        },
        depth: 0,
        pagination: false,
        overrideAccess: true,
        select: { to: true },
      })
      const to = [...new Set(logs.map((l) => l.to).filter((v): v is string => Boolean(v)))]
      if (to.length) {
        const until = new Date(new Date(c.sentAt).getTime() + 7 * 86_400_000).toISOString()
        const { docs: placed } = await payload.find({
          collection: 'orders',
          where: {
            and: [
              scope,
              { status: { not_in: ['pending', 'cancelled'] } },
              { placedAt: { greater_than: c.sentAt } },
              { placedAt: { less_than: until } },
              { or: [{ 'contact.email': { in: to } }, { 'contact.phone': { in: to } }] },
            ],
          },
          depth: 0,
          pagination: false,
          overrideAccess: true,
          select: { totals: true },
        })
        orders = placed.length
        sales = placed.reduce((s, o) => s + (o.totals?.grandTotalMinor ?? 0), 0)
      }
    }
    const sentCount = (c.stats?.email ?? 0) + (c.stats?.whatsapp ?? 0)
    rows.push({
      id: String(c.id),
      title: c.title,
      sub: [c.schemeName ? `Scheme: ${c.schemeName}` : null, AUDIENCE[c.audience ?? 'all']]
        .filter(Boolean)
        .join(' · '),
      channels: (c.channels ?? []).map((ch) => (ch === 'email' ? 'Email' : 'WhatsApp')).join(', '),
      send: when(c.sendAt),
      status: c.status,
      statusLabel: CAMPAIGN_STATUSES.find((s) => s.value === c.status)?.label ?? c.status,
      sent: c.status === 'sent' ? sentCount.toLocaleString('en-IN') : '—',
      orders: c.status === 'sent' ? String(orders) : '—',
      sales: c.status === 'sent' ? formatINR(sales) : '—',
      values: {
        title: c.title,
        scheme: c.scheme ?? '',
        subject: c.subject,
        headline: c.headline,
        detail: c.detail ?? '',
        buttonLabel: c.buttonLabel ?? 'Shop the offer',
        linkPath: c.linkPath ?? 'offers',
        audience: (c.audience ?? 'all') as 'all' | 'wishlist' | 'lapsed',
        channels: (c.channels ?? ['email']) as ('email' | 'whatsapp')[],
        sendAt: c.sendAt,
      },
    })
  }
  const schemeOptions: SchemeOption[] = schemes.docs.map((s) => {
    const rule = schemeRule(s)
    const ends = new Date(s.endsAt).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'Asia/Kolkata',
    })
    return {
      id: String(s.id),
      name: s.name,
      headline: describeScheme(rule),
      detail: `Ends ${ends}.`,
      linkPath: s.slug ? `offers/${s.slug}` : 'offers',
      startsAt: s.startsAt,
    }
  })
  const template = templates.docs.find((t) => t.milestone === 'offer_message')

  return (
    <div className="te-page">
      <PageHeader
        eyebrow={store.name}
        subtitle="Sent only to shoppers who asked for offers, on the channels they chose."
        title="Offer messages"
      />
      <OfferMessagesClient
        canSettings={canSettings}
        canWrite={canWrite}
        rows={rows}
        schemes={schemeOptions}
        settings={{
          maxPerShopperPerWeek: config?.maxPerShopperPerWeek ?? 2,
          cap: config?.maxPerShopperPerWeekCap ?? 3,
          windowStart: config?.sendWindow.start ?? '10:00',
          windowEnd: config?.sendWindow.end ?? '20:00',
        }}
        stats={{
          email: emailIn.totalDocs,
          whatsapp: phoneIn.totalDocs,
          unsubscribed: unsubscribed.totalDocs,
        }}
        storeId={store.id}
        storeName={facts.storeName}
        whatsapp={{
          on: whatsappOffersOn,
          template: template
            ? `${template.whatsapp?.name ?? 'offer_message'} · ${template.status === 'approved' ? 'Approved, marketing' : `${template.status ?? 'draft'}: submit it from WhatsApp and SMS`}`
            : `${MARKETING_TEMPLATES.offer_message.label}: open WhatsApp and SMS to create it`,
        }}
      />
    </div>
  )
}

import type { AdminViewServerProps } from 'payload'

import { ORDER_READ, STORE_ADMIN } from '@/access'
import { adminUrl } from '@/admin/paths'
import { requireSignedIn } from '@/admin/session/requireSignedIn'
import { currentStore, storeRolesOf } from '@/admin/store'
import { AdminScreen } from '@/admin/ui/AdminScreen'
import { Notice } from '@/admin/ui'
import { connectorOverview } from '@/connectors'
import { createLocalReq } from 'payload'
import { env } from '@/lib/env'

import { MILESTONES, TEMPLATE_STATUSES } from '../milestones'
import { renderEmail, renderWhatsApp, sampleFacts } from '../render'
import { loadSettings, ensureSettings } from '../services/settings'
import { storeFacts } from '../services/store'
import { ensureStarterTemplates, storeTemplates } from '../services/templates'
import type { Variant } from '../starter-templates'
import { OrderUpdatesForm, type PreviewItem, type StepRow } from './OrderUpdatesForm'

/** Order updates (docs/screens/vendor-cms.md `cms-notifications`). */
export async function OrderUpdatesView(view: AdminViewServerProps) {
  return (
    <AdminScreen view={view}>
      <OrderUpdates view={view} />
    </AdminScreen>
  )
}

// Meta's utility price to an Indian number, ₹0.115 + 18% GST (docs/18 "Costs", 2 October 2026)
const WHATSAPP_UTILITY_PAISE = 0.115 * 1.18 * 100

async function OrderUpdates({ view }: { view: AdminViewServerProps }) {
  const { req } = view.initPageResult
  requireSignedIn(req.user, adminUrl.notifications)
  const store = await currentStore(req.payload, req.user)
  if (!store) {
    return (
      <div className="te-page">
        <Notice tone="info">Open a store to see its order updates.</Notice>
      </div>
    )
  }
  const roles = storeRolesOf(req.user, store.id)
  if (!roles.some((role) => ORDER_READ.includes(role))) {
    return (
      <div className="te-page">
        <Notice tone="danger">Only owners, managers and order managers see order updates.</Notice>
      </div>
    )
  }
  const canEdit = roles.some((role) => STORE_ADMIN.includes(role))

  // The store's settings and starter templates exist from its first visit (older stores)
  const system = await createLocalReq({}, req.payload)
  await ensureSettings(system, store.id)
  await ensureStarterTemplates(system, store.id)

  const [settings, templates, facts, { connectors }] = await Promise.all([
    loadSettings(req.payload, store.id),
    storeTemplates(req.payload, store.id),
    storeFacts(req.payload, store.id),
    connectorOverview(req.payload, store.id),
  ])
  const whatsapp = connectors.find((row) => row.provider.key === 'meta-whatsapp')!
  const whatsappReady = whatsapp.connected && whatsapp.availability.allowed
  const details = (whatsapp.health?.details ?? {}) as Record<string, string | null>
  const approved = templates.filter((t) => t.status === 'approved').length
  const statusLabel = (value: string) =>
    TEMPLATE_STATUSES.find((s) => s.value === value)?.label ?? value

  const steps: StepRow[] = MILESTONES.map((m) => {
    const own = templates.filter((t) => t.milestone === m.key)
    const worst =
      own.find((t) => t.status === 'rejected') ??
      own.find((t) => t.status === 'paused') ??
      own.find((t) => t.status !== 'approved') ??
      own[0]
    return {
      key: m.key,
      label: m.label,
      description: m.description,
      later: 'later' in m && m.later === true,
      email: settings.milestones[m.key].email,
      whatsapp: settings.milestones[m.key].whatsapp,
      template: worst
        ? {
            status: own.every((t) => t.status === 'approved')
              ? 'approved'
              : (worst.status ?? 'draft'),
            label: own.every((t) => t.status === 'approved')
              ? 'Approved'
              : statusLabel(worst.status ?? 'draft'),
            reason: worst.rejectionReason ?? null,
          }
        : null,
    }
  })

  // The preview: every step and variant on both channels, with a sample order
  const previews: PreviewItem[] = []
  for (const m of MILESTONES) {
    for (const variant of m.variants as readonly Variant[]) {
      const sample = sampleFacts(facts, variant)
      const own = templates.find((t) => t.milestone === m.key && t.variant === variant)
      const wa = renderWhatsApp(
        m.key,
        variant,
        sample,
        own
          ? {
              body: own.body,
              variables: (own.variables ?? []) as never,
              trackButton: own.trackButton !== false,
            }
          : null,
      )
      const suffix = variant === 'default' ? '' : variant === 'cod' ? ' (COD)' : ' (prepaid)'
      previews.push({
        id: `${m.key}:${variant}:whatsapp`,
        label: `${m.label}${suffix} · WhatsApp`,
        milestone: m.key,
        variant,
        channel: 'whatsapp',
        text: wa.text,
        button: wa.buttonParam ? 'Track order' : null,
      })
      const email = renderEmail(m.key, variant, { ...sample, themeColor: facts.themeColor })
      previews.push({
        id: `${m.key}:${variant}:email`,
        label: `${m.label}${suffix} · Email`,
        milestone: m.key,
        variant,
        channel: 'email',
        text: email.text,
        subject: email.subject,
        button: 'Track order',
      })
    }
  }

  // A prepaid order's WhatsApp messages with these settings (confirmed, packed, shipped, out
  // for delivery, delivered and so on), at Meta's utility price
  const prepaidJourney = [
    'order_confirmed',
    'shipment_packed',
    'shipment_shipped',
    'shipment_in_transit',
    'shipment_out_for_delivery',
    'shipment_delivered',
  ] as const
  const perOrder = prepaidJourney.filter((key) => settings.milestones[key].whatsapp === 'on').length

  return (
    <OrderUpdatesForm
      canEdit={canEdit}
      channels={{
        whatsapp: {
          ready: whatsappReady,
          line: whatsappReady
            ? `Connected · ${approved} of ${templates.length} templates approved`
            : whatsapp.availability.allowed
              ? env.NODE_ENV === 'production'
                ? 'Not connected yet: updates go by email only'
                : 'Not connected: messages are printed to the server log here'
              : 'Not switched on for this store',
          quality: details.quality ?? null,
        },
        email: {
          line: `Sends as “${facts.storeName}”${facts.supportEmail ? `, replies go to ${facts.supportEmail}` : ''}`,
        },
      }}
      costLine={
        perOrder
          ? `About ₹${((perOrder * WHATSAPP_UTILITY_PAISE) / 100).toFixed(2)} per prepaid order with these settings: ${perOrder} WhatsApp message${perOrder === 1 ? '' : 's'}, billed to your own Meta account. Email costs nothing extra.`
          : 'No WhatsApp messages with these settings. Email costs nothing extra.'
      }
      initial={{
        milestones: steps.map((s) => ({ key: s.key, email: s.email, whatsapp: s.whatsapp })),
        packedDelayMinutes: settings.packedDelayMinutes,
        quietHours: settings.quietHours,
        whatsappOptInDefault: settings.whatsappOptInDefault,
        staffAlertEmails: settings.staffAlertEmails,
      }}
      messagingHref={adminUrl.messaging}
      perRecipientPerDay={settings.limits.perRecipientPerDay}
      previews={previews}
      steps={steps}
      storeId={store.id}
      testEmail={req.user && 'email' in req.user ? String(req.user.email ?? '') : ''}
    />
  )
}

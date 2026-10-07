import type { Payload, PayloadRequest } from 'payload'
import { z } from 'zod'

import type { NotificationSetting } from '@/payload-types'

import { MILESTONE_KEYS, MILESTONES, type MilestoneKey } from '../milestones'
import { assertNotificationAccess } from './access'

// Order update settings (docs/06 `notification-settings`): one per store, created with the
// defaults from docs/18 the first time the store is set up or the screen is opened.

export type MilestoneModes = { email: 'on' | 'off'; whatsapp: 'on' | 'off'; sms: string }

export type ResolvedSettings = {
  id: string | null
  milestones: Record<MilestoneKey, MilestoneModes>
  packedDelayMinutes: number
  quietHours: { enabled: boolean; start: string; end: string }
  whatsappOptInDefault: boolean
  staffAlertEmails: string[]
  limits: { perRecipientPerDay: number; smsPerDay: number }
}

export const defaultMilestoneRows = () => MILESTONES.map((m) => ({ key: m.key, ...m.defaults }))

/** The stored settings with every missing value filled from the defaults */
export function resolveSettings(doc: NotificationSetting | null | undefined): ResolvedSettings {
  const rows = new Map((doc?.milestones ?? []).map((row) => [row.key, row]))
  const milestones = Object.fromEntries(
    MILESTONES.map((m) => {
      const row = rows.get(m.key)
      return [
        m.key,
        {
          email: (row?.email ?? m.defaults.email) as 'on' | 'off',
          whatsapp: (row?.whatsapp ?? m.defaults.whatsapp) as 'on' | 'off',
          sms: row?.sms ?? m.defaults.sms,
        },
      ]
    }),
  ) as Record<MilestoneKey, MilestoneModes>
  return {
    id: doc ? String(doc.id) : null,
    milestones,
    packedDelayMinutes: doc?.packedDelayMinutes ?? 15,
    quietHours: {
      enabled: doc?.quietHours?.enabled ?? true,
      start: doc?.quietHours?.start || '21:00',
      end: doc?.quietHours?.end || '09:00',
    },
    whatsappOptInDefault: doc?.whatsappOptInDefault ?? true,
    staffAlertEmails: doc?.staffAlertEmails ?? [],
    limits: {
      perRecipientPerDay: doc?.limits?.perRecipientPerDay ?? 10,
      smsPerDay: doc?.limits?.smsPerDay ?? 2000,
    },
  }
}

async function settingsDoc(payload: Payload, tenantId: string, req?: PayloadRequest) {
  const { docs } = await payload.find({
    collection: 'notification-settings',
    where: { tenant: { equals: tenantId } },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  return docs[0] ?? null
}

export async function loadSettings(
  payload: Payload,
  tenantId: string,
  req?: PayloadRequest,
): Promise<ResolvedSettings> {
  return resolveSettings(await settingsDoc(payload, tenantId, req))
}

/** Creates the store's settings with the defaults when it has none (tenant.created, the screen) */
export async function ensureSettings(req: PayloadRequest, tenantId: string): Promise<string> {
  const existing = await settingsDoc(req.payload, tenantId, req)
  if (existing) return String(existing.id)
  const created = await req.payload.create({
    collection: 'notification-settings',
    data: { tenant: tenantId, milestones: defaultMilestoneRows() },
    overrideAccess: true,
    req,
  })
  return String(created.id)
}

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour time, for example 21:00')
const onOff = z.enum(['on', 'off'])

export const settingsInputSchema = z.object({
  milestones: z
    .array(z.object({ key: z.enum(MILESTONE_KEYS), email: onOff, whatsapp: onOff }))
    .max(MILESTONES.length),
  packedDelayMinutes: z.number().int().min(0, 'At least 0').max(240, 'At most 240 minutes'),
  quietHours: z.object({ enabled: z.boolean(), start: time, end: time }),
  whatsappOptInDefault: z.boolean(),
  staffAlertEmails: z.array(z.email('Enter a valid email').trim().toLowerCase()).max(10),
})
export type SettingsInput = z.infer<typeof settingsInputSchema>

/** Saves the Order updates screen. SMS cells and the platform limits are kept as they are. */
export async function saveSettings(req: PayloadRequest, tenantId: string, input: SettingsInput) {
  assertNotificationAccess(req, tenantId, 'settings')
  const id = await ensureSettings(req, tenantId)
  const current = resolveSettings(await settingsDoc(req.payload, tenantId, req))
  const changed = new Map(input.milestones.map((row) => [row.key, row]))
  const milestones = MILESTONES.map((m) => {
    const now = current.milestones[m.key]
    const row = changed.get(m.key)
    return {
      key: m.key,
      email: row?.email ?? now.email,
      whatsapp: row?.whatsapp ?? now.whatsapp,
      sms: now.sms as 'on' | 'off' | 'fallback',
    }
  })
  return req.payload.update({
    collection: 'notification-settings',
    id,
    data: {
      milestones,
      packedDelayMinutes: input.packedDelayMinutes,
      quietHours: input.quietHours,
      whatsappOptInDefault: input.whatsappOptInDefault,
      staffAlertEmails: [...new Set(input.staffAlertEmails.map((e) => e.trim().toLowerCase()))],
    },
    overrideAccess: false,
    user: req.user,
    req,
  })
}

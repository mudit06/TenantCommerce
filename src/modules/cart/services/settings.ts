import type { PayloadRequest } from 'payload'
import { z } from 'zod'

import { hasTenantRole, STORE_ADMIN, storeSessionOf } from '@/access'
import { AppError } from '@/lib/errors'
import { normalizeCode } from '@/modules/promotions'
import { requireFeature } from '@/modules/tenancy'

// The Abandoned carts screen's reminder settings (docs/screens Abandoned carts): owners and
// managers, or a platform admin managing the store; support reads only.

export async function assertCartsAccess(
  req: PayloadRequest,
  tenantId: string,
  what: 'read' | 'write',
) {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 'Sign in first', 401)
  const session = storeSessionOf(req.user)
  if (session) {
    if (session.tenantId !== tenantId || (what === 'write' && session.mode !== 'manage')) {
      throw new AppError('FORBIDDEN', 'Open this store with “Manage store” to change this', 403)
    }
  } else if (!hasTenantRole(req.user, tenantId, STORE_ADMIN)) {
    throw new AppError('FORBIDDEN', 'Your role can’t do this', 403)
  }
  await requireFeature(req.payload, tenantId, 'abandoned-cart')
}

const channels = z.array(z.enum(['email', 'whatsapp'])).min(1, 'Pick at least one channel')

export const abandonedSettingsSchema = z.object({
  firstAfterMinutes: z
    .number()
    .int()
    .min(15)
    .max(24 * 60),
  secondAfterHours: z
    .number()
    .int()
    .min(2)
    .max(7 * 24)
    .nullable(),
  channels,
  secondChannels: channels,
  secondCoupon: z.string().trim().max(40).nullable(),
})

/** Saves the store's reminder delays, channels and the second reminder's code (feature config). */
export async function saveAbandonedSettings(
  req: PayloadRequest,
  tenantId: string,
  input: z.infer<typeof abandonedSettingsSchema>,
) {
  const data = abandonedSettingsSchema.parse(input)
  const code = data.secondCoupon ? normalizeCode(data.secondCoupon) : null
  if (code) {
    const { totalDocs } = await req.payload.count({
      collection: 'coupons',
      where: {
        and: [
          { tenant: { equals: tenantId } },
          { codeNormalized: { equals: code } },
          { status: { equals: 'active' } },
        ],
      },
      overrideAccess: true,
      req,
    })
    if (!totalDocs) {
      throw new AppError('VALIDATION_FAILED', 'Pick an active coupon', 400, {
        secondCoupon: 'No active coupon with this code',
      })
    }
  }
  const { docs } = await req.payload.find({
    collection: 'feature-flags',
    where: { and: [{ tenant: { equals: tenantId } }, { key: { equals: 'abandoned-cart' } }] },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  const flag = docs[0]
  if (!flag) throw new AppError('FEATURE_DISABLED', 'Not found', 404)
  return req.payload.update({
    collection: 'feature-flags',
    id: flag.id,
    data: { config: { ...((flag.config as object) ?? {}), ...data, secondCoupon: code } },
    overrideAccess: false,
    user: req.user,
    req,
  })
}

import type { PayloadRequest } from 'payload'
import { z } from 'zod'

import { recordAudit } from '@/modules/audit'
import { AppError } from '@/lib/errors'
import { queuePreparedEmail, setOfferConsent, storeFacts } from '@/modules/notifications'
import type { Affiliate } from '@/payload-types'

import { PROMOTES_ON } from '../constants'
import { affiliateOfCustomer, ownAffiliate, programConfig, type ProgramConfig } from './access'
import { maskPan, panSchema } from '../rules'
import { sealPan } from './private'

// Applications, approval, rates, personal coupons and the program settings (docs/screens
// Affiliates, Affiliate program).

/** An email to the affiliate in the store's name (approval, statements, changed details) */
export async function emailAffiliate(
  req: PayloadRequest,
  tenantId: string,
  affiliate: Pick<Affiliate, 'id' | 'email' | 'name'>,
  message: {
    key: string
    subject: string
    heading: string
    paragraphs: string[]
    button?: { label: string; path: string }
  },
) {
  const store = await storeFacts(req.payload, tenantId, req)
  await queuePreparedEmail(req, {
    tenantId,
    kind: 'affiliate',
    milestone: `affiliate_${message.key.split(':')[0]}`,
    to: affiliate.email,
    dedupeKey: `affiliate:${affiliate.id}:${message.key}`,
    email: {
      subject: message.subject,
      heading: message.heading,
      paragraphs: [`Hi ${affiliate.name.split(' ')[0]},`, ...message.paragraphs],
      button: message.button
        ? { label: message.button.label, url: `${store.storeOrigin}/${message.button.path}` }
        : null,
      footer: `You get this because you are an affiliate of ${store.storeName}.`,
    },
  })
}

/** A short code from the name, unique in the store: RIYA, RIYA2… */
async function freeCode(req: PayloadRequest, tenantId: string, name: string) {
  const base =
    name
      .toUpperCase()
      .normalize('NFKD')
      .replace(/[^A-Z0-9 ]/g, '')
      .split(' ')
      .filter(Boolean)[0]
      ?.slice(0, 10) || 'PARTNER'
  for (let n = 1; n < 200; n += 1) {
    const code = n === 1 ? base : `${base}${n}`
    const { totalDocs } = await req.payload.count({
      collection: 'affiliates',
      where: { and: [{ tenant: { equals: tenantId } }, { code: { equals: code } }] },
      overrideAccess: true,
      req,
    })
    if (!totalDocs) return code
  }
  throw new AppError('CONFLICT', 'Could not make a code; try again', 409)
}

export const applicationSchema = z.object({
  name: z.string().trim().min(2, 'Your full name').max(80),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}$/, 'A 10-digit Indian mobile number'),
  promotesOn: z.enum(PROMOTES_ON.map((p) => p.value) as [string, ...string[]], {
    message: 'Where do you share?',
  }),
  profileUrl: z.string().trim().max(200).optional(),
  audienceNote: z.string().trim().max(600).optional(),
  pan: z.union([z.literal(''), panSchema]).optional(),
  acceptTerms: z.literal(true, { message: 'Accept the terms to apply' }),
  offers: z.boolean().optional(),
})
export type ApplicationInput = z.input<typeof applicationSchema>

/** A shopper applies with their store account (Affiliate program rule 2). */
export async function applyAsAffiliate(
  req: PayloadRequest,
  tenantId: string,
  customer: { id: string; email: string },
  input: ApplicationInput,
): Promise<Affiliate> {
  const data = applicationSchema.parse(input)
  const config = await programConfig(req.payload, tenantId, req)
  if (!config) throw new AppError('FEATURE_DISABLED', 'This store has no affiliate program', 404)
  const existing = await affiliateOfCustomer(req.payload, tenantId, customer.id, req)
  if (existing && existing.status !== 'rejected') {
    throw new AppError('CONFLICT', 'You have already applied', 409)
  }
  const digits = data.phone.replace(/\D/g, '').slice(-10)
  const now = new Date().toISOString()
  const auto = config.autoApproveApplications
  const values = {
    name: data.name,
    email: customer.email.toLowerCase(),
    phone: `+91${digits}`,
    status: auto ? ('approved' as const) : ('applied' as const),
    application: {
      promotesOn: data.promotesOn as NonNullable<Affiliate['application']>['promotesOn'],
      profileUrl: data.profileUrl || null,
      audienceNote: data.audienceNote || null,
      appliedAt: now,
      termsAcceptedAt: now,
    },
    ...(data.pan ? { panSealed: sealPan(data.pan), panMasked: maskPan(data.pan) } : {}),
    ...(auto ? { approvedAt: now, commissionPercent: config.defaultCommissionPercent } : {}),
    rejectReason: null,
  }
  const affiliate = existing
    ? await req.payload.update({
        collection: 'affiliates',
        id: existing.id,
        data: values,
        overrideAccess: true,
        req,
      })
    : await req.payload.create({
        collection: 'affiliates',
        data: {
          tenant: tenantId,
          customer: customer.id,
          code: await freeCode(req, tenantId, data.name),
          ...values,
        },
        overrideAccess: true,
        req,
      })
  if (data.offers) {
    await setOfferConsent(req, tenantId, 'email', affiliate.email, true, 'affiliate')
  }
  if (auto) await welcome(req, tenantId, affiliate, config)
  return affiliate
}

async function welcome(
  req: PayloadRequest,
  tenantId: string,
  affiliate: Affiliate,
  config: ProgramConfig,
) {
  const store = await storeFacts(req.payload, tenantId, req)
  await emailAffiliate(req, tenantId, affiliate, {
    key: `approved:${affiliate.approvedAt ?? ''}`,
    subject: `You are an affiliate of ${store.storeName}`,
    heading: 'Your application is approved',
    paragraphs: [
      `Share your link ${store.storeOrigin}/r/${affiliate.code} and earn ${affiliate.commissionPercent ?? config.defaultCommissionPercent}% of every order you refer, before GST and delivery.`,
      `Commission is confirmed ${config.holdDays} days after delivery and paid each month once it reaches ₹${Math.round(config.minPayoutMinor / 100).toLocaleString('en-IN')}. Please mark your posts as a paid partnership.`,
    ],
    button: { label: 'Open your dashboard', path: 'affiliate/dashboard' },
  })
}

export const statusActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'pause', 'resume']),
  reason: z.string().trim().max(300).optional(),
})

const NEXT: Record<string, { from: Affiliate['status'][]; to: Affiliate['status'] }> = {
  approve: { from: ['applied', 'rejected'], to: 'approved' },
  reject: { from: ['applied'], to: 'rejected' },
  pause: { from: ['approved'], to: 'paused' },
  resume: { from: ['paused'], to: 'approved' },
}

export async function setAffiliateStatus(
  req: PayloadRequest,
  tenantId: string,
  id: string,
  input: z.infer<typeof statusActionSchema>,
) {
  const { action, reason } = statusActionSchema.parse(input)
  const affiliate = await ownAffiliate(req.payload, tenantId, id, req)
  const step = NEXT[action]!
  if (!step.from.includes(affiliate.status)) {
    throw new AppError('INVALID_TRANSITION', `This affiliate is ${affiliate.status}`, 409)
  }
  if (action === 'reject' && !reason) {
    throw new AppError('VALIDATION_FAILED', 'Say why', 400, { reason: 'Say why' })
  }
  const config = (await programConfig(req.payload, tenantId, req))!
  const now = new Date().toISOString()
  const updated = await req.payload.update({
    collection: 'affiliates',
    id: affiliate.id,
    data: {
      status: step.to,
      ...(action === 'approve'
        ? {
            approvedAt: now,
            approvedBy: String(req.user?.id ?? ''),
            commissionPercent: affiliate.commissionPercent ?? config.defaultCommissionPercent,
            rejectReason: null,
          }
        : {}),
      ...(action === 'reject' ? { rejectReason: reason } : {}),
    },
    overrideAccess: true,
    req,
  })
  await recordAudit(req, {
    action: 'commission_changed',
    tenant: tenantId,
    summary: `Affiliate ${affiliate.code}: ${action}`,
    collectionSlug: 'affiliates',
    docId: String(affiliate.id),
    reason,
  })
  const store = await storeFacts(req.payload, tenantId, req)
  if (action === 'approve') await welcome(req, tenantId, updated, config)
  if (action === 'reject') {
    await emailAffiliate(req, tenantId, updated, {
      key: `rejected:${now}`,
      subject: `Your affiliate application to ${store.storeName}`,
      heading: 'About your application',
      paragraphs: [
        `Thank you for applying. We can’t take you into the program right now: ${reason}.`,
      ],
    })
  }
  return updated
}

export const ratesSchema = z.object({
  commissionPercent: z.number().min(0).max(50),
  categoryRates: z
    .array(
      z.object({
        category: z.string().min(1),
        percent: z.number().min(0).max(50),
      }),
    )
    .max(20)
    .default([]),
})

/** The affiliate's rate and any category rates (logged: commission changes are audited). */
export async function saveRates(
  req: PayloadRequest,
  tenantId: string,
  id: string,
  input: z.input<typeof ratesSchema>,
) {
  const data = ratesSchema.parse(input)
  const affiliate = await ownAffiliate(req.payload, tenantId, id, req)
  const ids = [...new Set(data.categoryRates.map((r) => r.category))]
  const { docs: categories } = ids.length
    ? await req.payload.find({
        collection: 'categories',
        where: { and: [{ tenant: { equals: tenantId } }, { id: { in: ids } }] },
        depth: 0,
        pagination: false,
        overrideAccess: true,
        select: { name: true },
        req,
      })
    : { docs: [] }
  const nameOf = new Map(categories.map((c) => [String(c.id), c.name]))
  if (ids.some((c) => !nameOf.has(c))) {
    throw new AppError('VALIDATION_FAILED', 'Pick categories of this store', 400)
  }
  const updated = await req.payload.update({
    collection: 'affiliates',
    id: affiliate.id,
    data: {
      commissionPercent: data.commissionPercent,
      categoryRates: data.categoryRates.map((r) => ({
        category: r.category,
        categoryName: nameOf.get(r.category),
        percent: r.percent,
      })),
    },
    overrideAccess: true,
    req,
  })
  await recordAudit(req, {
    action: 'commission_changed',
    tenant: tenantId,
    summary: `Affiliate ${affiliate.code}: rate ${data.commissionPercent}%${data.categoryRates.length ? ` and ${data.categoryRates.length} category rates` : ''}`,
    collectionSlug: 'affiliates',
    docId: String(affiliate.id),
    diff: {
      from: {
        commissionPercent: affiliate.commissionPercent,
        categoryRates: affiliate.categoryRates,
      },
      to: data,
    },
  })
  return updated
}

/** Links one of the store's coupons to the affiliate (or none): the coupon then credits them. */
export async function linkCoupon(
  req: PayloadRequest,
  tenantId: string,
  id: string,
  couponId: string | null,
) {
  const affiliate = await ownAffiliate(req.payload, tenantId, id, req)
  if (couponId) {
    const { docs } = await req.payload.find({
      collection: 'coupons',
      where: { and: [{ tenant: { equals: tenantId } }, { id: { equals: couponId } }] },
      limit: 1,
      depth: 0,
      pagination: false,
      overrideAccess: true,
      req,
    })
    const coupon = docs[0]
    if (!coupon) throw new AppError('NOT_FOUND', 'Coupon not found', 404)
    if (coupon.affiliate && coupon.affiliate !== String(affiliate.id)) {
      throw new AppError('CONFLICT', `${coupon.code} already credits another affiliate`, 409)
    }
    await req.payload.update({
      collection: 'coupons',
      id: coupon.id,
      data: { affiliate: String(affiliate.id) },
      overrideAccess: true,
      req,
    })
  }
  if (affiliate.coupon && affiliate.coupon !== couponId) {
    await req.payload.update({
      collection: 'coupons',
      where: { and: [{ tenant: { equals: tenantId } }, { id: { equals: affiliate.coupon } }] },
      data: { affiliate: null },
      overrideAccess: true,
      req,
    })
  }
  return req.payload.update({
    collection: 'affiliates',
    id: affiliate.id,
    data: { coupon: couponId },
    overrideAccess: true,
    req,
  })
}

export const programSchema = z.object({
  defaultCommissionPercent: z.number().min(0).max(50),
  cookieDays: z.number().int().min(1).max(90),
  holdDays: z.number().int().min(0).max(60),
  minPayoutMinor: z.number().int().min(0).max(10_000_00),
  autoApproveApplications: z.boolean(),
  termsPath: z
    .string()
    .trim()
    .regex(/^[a-z0-9/_-]*$/i, 'A page of the store, like pages/affiliate-terms')
    .max(120),
})

/** The program settings (feature config), owners and managers. */
export async function saveProgram(
  req: PayloadRequest,
  tenantId: string,
  input: z.infer<typeof programSchema>,
) {
  const data = programSchema.parse(input)
  const { docs } = await req.payload.find({
    collection: 'feature-flags',
    where: { and: [{ tenant: { equals: tenantId } }, { key: { equals: 'affiliate' } }] },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  const flag = docs[0]
  if (!flag) throw new AppError('FEATURE_DISABLED', 'Not found', 404)
  await recordAudit(req, {
    action: 'commission_changed',
    tenant: tenantId,
    summary: `Affiliate program: default rate ${data.defaultCommissionPercent}%`,
    collectionSlug: 'feature-flags',
    docId: String(flag.id),
    diff: { from: flag.config, to: data },
  })
  return req.payload.update({
    collection: 'feature-flags',
    id: flag.id,
    data: { config: { ...((flag.config as object) ?? {}), ...data } },
    overrideAccess: false,
    user: req.user,
    req,
  })
}

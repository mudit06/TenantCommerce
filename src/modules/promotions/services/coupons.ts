import { randomInt } from 'node:crypto'

import type { PayloadRequest } from 'payload'
import { z } from 'zod'

import { editorName } from '@/fields/editedBy'
import { AppError } from '@/lib/errors'
import { featureConfig } from '@/modules/tenancy'
import type { Coupon } from '@/payload-types'

import { normalizeCode } from '../rules'

// The Coupons screen's actions (docs/screens Coupons): save a coupon with a code unique in the
// store, pause or resume it, and make single-use bulk codes from one coupon.

const paise = z.number().int().min(0).nullable().optional()

export const couponInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, 'At least 3 letters or numbers')
      .max(30)
      .regex(/^[A-Za-z0-9-]+$/, 'Letters, numbers and hyphens only'),
    description: z.string().trim().max(200).optional(),
    type: z.enum(['percent', 'fixed', 'free-shipping']),
    percent: z.number().min(1).max(90).nullable().optional(),
    amountMinor: paise,
    minOrderMinor: paise,
    maxDiscountMinor: paise,
    appliesTo: z
      .object({
        mode: z.enum(['all', 'categories', 'products']).default('all'),
        categories: z.array(z.string()).max(200).default([]),
        products: z.array(z.string()).max(500).default([]),
      })
      .default({ mode: 'all', categories: [], products: [] }),
    startsAt: z.string().datetime().nullable().optional(),
    endsAt: z.string().datetime().nullable().optional(),
    usageLimit: z.number().int().min(1).nullable().optional(),
    perCustomerLimit: z.number().int().min(1).max(100).nullable().optional(),
    firstOrderOnly: z.boolean().default(false),
    paymentMethods: z.array(z.enum(['razorpay', 'cod'])).default([]),
    visibility: z.enum(['public', 'private']).default('private'),
    scheme: z.string().nullable().optional(),
    affiliate: z.string().nullable().optional(),
  })
  .refine((c) => c.type !== 'percent' || c.percent, {
    path: ['percent'],
    message: 'Enter the percent off',
  })
  .refine((c) => c.type !== 'fixed' || c.amountMinor, {
    path: ['amountMinor'],
    message: 'Enter the amount off',
  })
  .refine((c) => !c.startsAt || !c.endsAt || c.endsAt > c.startsAt, {
    path: ['endsAt'],
    message: 'Ends after it starts',
  })
export type CouponInput = z.input<typeof couponInputSchema>

async function own(req: PayloadRequest, tenantId: string, id: string): Promise<Coupon> {
  const { docs } = await req.payload.find({
    collection: 'coupons',
    where: { and: [{ tenant: { equals: tenantId } }, { id: { equals: id } }] },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  if (!docs[0]) throw new AppError('NOT_FOUND', 'Coupon not found', 404)
  return docs[0]
}

async function codeTaken(
  req: PayloadRequest,
  tenantId: string,
  normalized: string,
  except?: string,
) {
  const { totalDocs } = await req.payload.count({
    collection: 'coupons',
    where: {
      and: [
        { tenant: { equals: tenantId } },
        { codeNormalized: { equals: normalized } },
        ...(except ? [{ id: { not_equals: except } }] : []),
      ],
    },
    overrideAccess: true,
    req,
  })
  return totalDocs > 0
}

export async function saveCoupon(
  req: PayloadRequest,
  tenantId: string,
  input: CouponInput,
  id?: string | null,
): Promise<Coupon> {
  const data = couponInputSchema.parse(input)
  const normalized = normalizeCode(data.code)
  if (await codeTaken(req, tenantId, normalized, id ?? undefined)) {
    throw new AppError('CONFLICT', `${normalized} is already a code in this store`, 409, {
      code: 'This code is already used',
    })
  }
  const existing = id ? await own(req, tenantId, id) : null
  const ended = data.endsAt ? new Date(data.endsAt).getTime() <= Date.now() : false
  const fields = {
    code: data.code.trim(),
    codeNormalized: normalized,
    description: data.description || null,
    type: data.type,
    percent: data.type === 'percent' ? (data.percent ?? null) : null,
    amountMinor: data.type === 'fixed' ? (data.amountMinor ?? null) : null,
    minOrderMinor: data.minOrderMinor ?? null,
    maxDiscountMinor: data.type === 'percent' ? (data.maxDiscountMinor ?? null) : null,
    appliesTo: data.appliesTo,
    startsAt: data.startsAt ?? null,
    endsAt: data.endsAt ?? null,
    usageLimit: data.usageLimit ?? null,
    // Once per shopper unless the vendor says otherwise (docs/06 `coupons`)
    perCustomerLimit: data.perCustomerLimit === undefined ? 1 : data.perCustomerLimit,
    firstOrderOnly: data.firstOrderOnly,
    paymentMethods: data.paymentMethods,
    visibility: data.visibility,
    scheme: data.scheme || null,
    // Linked from the Affiliates screen; an edit here keeps the link unless it says otherwise
    ...(data.affiliate !== undefined ? { affiliate: data.affiliate || null } : {}),
    lastEditedBy: editorName(req.user) ?? undefined,
    // An end date in the future brings an expired coupon back
    ...(existing?.status === 'expired' && !ended ? { status: 'active' as const } : {}),
    ...(ended ? { status: 'expired' as const } : {}),
  }
  if (existing) {
    return req.payload.update({
      collection: 'coupons',
      id: existing.id,
      data: fields,
      overrideAccess: true,
      req,
    })
  }
  return req.payload.create({
    collection: 'coupons',
    data: { tenant: tenantId, ...fields, usedCount: 0, status: fields.status ?? 'active' },
    overrideAccess: true,
    req,
  })
}

export async function setCouponPaused(
  req: PayloadRequest,
  tenantId: string,
  id: string,
  paused: boolean,
) {
  const coupon = await own(req, tenantId, id)
  if (coupon.status === 'expired')
    throw new AppError('INVALID_TRANSITION', 'This coupon has ended', 409)
  return req.payload.update({
    collection: 'coupons',
    id: coupon.id,
    data: { status: paused ? 'paused' : 'active', lastEditedBy: editorName(req.user) ?? undefined },
    overrideAccess: true,
    req,
  })
}

export const bulkSchema = z.object({
  basedOn: z.string().min(1, 'Choose the coupon the codes copy'),
  prefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,10}$/, '2 to 10 letters or numbers'),
  count: z.number().int().min(1).max(5000),
})

// No 0/O or 1/I: the codes are typed from a printed leaflet
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const randomPart = () =>
  Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')

/**
 * Bulk codes (rule 4): single-use copies of one coupon, `PREFIX-XXXXXX`, for a leaflet or a
 * partner. Answers with the codes for the CSV.
 */
export async function makeBulkCodes(
  req: PayloadRequest,
  tenantId: string,
  input: z.input<typeof bulkSchema>,
): Promise<{ batchId: string; codes: string[] }> {
  const data = bulkSchema.parse(input)
  const config = await featureConfig<{ maxCodesPerBulkRun: number }>(
    req.payload,
    tenantId,
    'coupons',
    req,
  )
  if (config && data.count > config.maxCodesPerBulkRun) {
    throw new AppError(
      'PLAN_LIMIT_REACHED',
      `At most ${config.maxCodesPerBulkRun} codes at a time`,
      422,
      {
        count: `At most ${config.maxCodesPerBulkRun}`,
      },
    )
  }
  const base = await own(req, tenantId, data.basedOn)
  const batchId = `${data.prefix}-${Date.now().toString(36)}`
  const codes = new Set<string>()
  while (codes.size < data.count) codes.add(`${data.prefix}-${randomPart()}`)
  const list = [...codes]
  const { docs: clash } = await req.payload.find({
    collection: 'coupons',
    where: { and: [{ tenant: { equals: tenantId } }, { codeNormalized: { in: list } }] },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { codeNormalized: true },
    req,
  })
  const taken = new Set(clash.map((c) => c.codeNormalized))
  const fresh = list.filter((code) => !taken.has(code))
  for (const code of fresh) {
    await req.payload.create({
      collection: 'coupons',
      data: {
        tenant: tenantId,
        code,
        codeNormalized: code,
        description: `Bulk code from ${base.code}`,
        type: base.type,
        percent: base.percent,
        amountMinor: base.amountMinor,
        minOrderMinor: base.minOrderMinor,
        maxDiscountMinor: base.maxDiscountMinor,
        appliesTo: base.appliesTo,
        startsAt: base.startsAt,
        endsAt: base.endsAt,
        usageLimit: 1,
        perCustomerLimit: 1,
        usedCount: 0,
        firstOrderOnly: base.firstOrderOnly,
        paymentMethods: base.paymentMethods,
        visibility: 'private',
        scheme: base.scheme,
        batch: { id: batchId, prefix: data.prefix, count: fresh.length },
        status: 'active',
        lastEditedBy: editorName(req.user) ?? undefined,
      },
      overrideAccess: true,
      req,
    })
  }
  return { batchId, codes: fresh }
}

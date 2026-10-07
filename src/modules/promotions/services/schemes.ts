import type { PayloadRequest } from 'payload'
import { z } from 'zod'

import { idOf } from '@/access'
import { editorName } from '@/fields/editedBy'
import { AppError } from '@/lib/errors'
import { featureConfig } from '@/modules/tenancy'
import type { Scheme } from '@/payload-types'

import { occasionOf, OCCASIONS } from '../occasions'
import { categoryAncestors } from './load'
import { schemeRule } from './load'
import { computePromotions, schemeUnitPrice, type PromoLine } from '../rules'

// The Schemes screen's actions (docs/screens Schemes, Scheme editor): start a draft from an
// occasion, schedule, pause, resume and end; and the preview, worked out by the same engine as
// checkout on the store's own products.

export async function schemeOf(req: PayloadRequest, tenantId: string, id: string): Promise<Scheme> {
  const { docs } = await req.payload.find({
    collection: 'schemes',
    where: { and: [{ tenant: { equals: tenantId } }, { id: { equals: id } }] },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  if (!docs[0]) throw new AppError('NOT_FOUND', 'Scheme not found', 404)
  return docs[0]
}

export const newSchemeSchema = z.object({
  occasion: z.enum(OCCASIONS.map((o) => o.value) as [string, ...string[]]),
})

/**
 * "Start from an occasion": a draft with the occasion's name, badge and offer type. Dates are
 * a placeholder week from tomorrow; the vendor types the real ones (rule 1).
 */
export async function createFromOccasion(req: PayloadRequest, tenantId: string, occasion: string) {
  const template = occasionOf(occasion)
  const start = new Date()
  start.setUTCDate(start.getUTCDate() + 1)
  start.setUTCHours(18, 30, 0, 0) // midnight in India
  const end = new Date(start.getTime() + 7 * 86_400_000 - 60_000)
  const year = start.getUTCFullYear()
  const name = template.value === 'custom' ? 'New scheme' : `${template.label} ${year}`
  return req.payload.create({
    collection: 'schemes',
    data: {
      tenant: tenantId,
      name,
      occasion: template.value as Scheme['occasion'],
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      status: 'draft',
      offer: {
        type: template.type,
        percent: template.percent || undefined,
        ...(template.type === 'buy-x-get-y'
          ? { buyQty: 2, getQty: 1, getDiscountPercent: 100 }
          : {}),
        ...(template.type === 'tiered'
          ? { tiers: [{ minOrderMinor: 2_500_000, discountMinor: 200_000 }] }
          : {}),
      },
      appliesTo: { mode: 'all' },
      display: {
        badgeText: template.badge || undefined,
        showBeforeStart: true,
        showCountdown: true,
      },
    },
    overrideAccess: true,
    req,
  })
}

export const statusSchema = z.object({ action: z.enum(['schedule', 'pause', 'resume', 'end']) })

/** Schedule, Pause, Resume and End now. A scheme past its end can't be scheduled again. */
export async function changeSchemeStatus(
  req: PayloadRequest,
  tenantId: string,
  id: string,
  action: z.infer<typeof statusSchema>['action'],
) {
  const scheme = await schemeOf(req, tenantId, id)
  const now = Date.now()
  const started = new Date(scheme.startsAt).getTime() <= now
  const over = new Date(scheme.endsAt).getTime() <= now
  let status: Scheme['status']
  switch (action) {
    case 'schedule':
    case 'resume':
      if (scheme.status === 'ended' || over) {
        throw new AppError(
          'INVALID_TRANSITION',
          'This scheme has ended. Copy it with new dates instead.',
          409,
        )
      }
      if (action === 'schedule' && scheme.status !== 'draft') {
        throw new AppError('INVALID_TRANSITION', 'Only a draft can be scheduled', 409)
      }
      if (action === 'resume' && scheme.status !== 'paused') {
        throw new AppError('INVALID_TRANSITION', 'Only a paused scheme can be resumed', 409)
      }
      status = started ? 'live' : 'scheduled'
      break
    case 'pause':
      if (scheme.status !== 'live' && scheme.status !== 'scheduled') {
        throw new AppError(
          'INVALID_TRANSITION',
          'Only a live or scheduled scheme can be paused',
          409,
        )
      }
      status = 'paused'
      break
    case 'end':
      if (scheme.status === 'ended' || scheme.status === 'draft') {
        throw new AppError('INVALID_TRANSITION', 'Only a running scheme can be ended', 409)
      }
      status = 'ended'
      break
  }
  if (status === 'live' || status === 'scheduled') {
    // The plan's limit of schemes running at once (feature config, docs/08)
    const config = await featureConfig<{ maxLiveSchemes: number }>(
      req.payload,
      tenantId,
      'schemes',
      req,
    )
    const { totalDocs } = await req.payload.count({
      collection: 'schemes',
      where: {
        and: [
          { tenant: { equals: tenantId } },
          { status: { in: ['live', 'scheduled'] } },
          { id: { not_equals: id } },
        ],
      },
      overrideAccess: true,
      req,
    })
    if (config && totalDocs >= config.maxLiveSchemes) {
      throw new AppError(
        'PLAN_LIMIT_REACHED',
        `Your plan runs up to ${config.maxLiveSchemes} schemes at once. End or pause one first.`,
        422,
      )
    }
  }
  return req.payload.update({
    collection: 'schemes',
    id: scheme.id,
    data: {
      status,
      ...(status === 'ended' ? { endedAt: new Date().toISOString() } : {}),
      lastEditedBy: editorName(req.user) ?? undefined,
    },
    overrideAccess: true,
    context: { schemeSwitch: true },
    req,
  })
}

export type SchemePreview = {
  card: {
    title: string
    modelNumber: string | null
    priceMinor: number
    mrpMinor: number | null
    badge: string | null
    until: string
  } | null
  cart: {
    lines: { title: string; amountMinor: number }[]
    discountMinor: number
    totalMinor: number
    freeShipping: boolean
  } | null
}

/**
 * The editor's preview (rule 8): a product card and a sample cart of two covered products,
 * priced by the same engine as checkout as if the scheme were live now.
 */
export async function previewScheme(
  req: PayloadRequest,
  tenantId: string,
  id: string,
): Promise<SchemePreview> {
  const scheme = await schemeOf(req, tenantId, id)
  const rule = schemeRule(scheme)
  const { docs: products } = await req.payload.find({
    collection: 'products',
    where: {
      and: [
        { tenant: { equals: tenantId } },
        { status: { equals: 'active' } },
        { purchaseMode: { not_equals: 'enquire' } },
        { 'price.amountMinor': { greater_than: 0 } },
        ...(rule.covers.mode === 'products' ? [{ id: { in: rule.covers.productIds } }] : []),
        ...(rule.covers.excludeProductIds.length
          ? [{ id: { not_in: rule.covers.excludeProductIds } }]
          : []),
        ...(rule.type === 'special-price'
          ? [
              {
                id: {
                  in: (scheme.offer?.specialPrices ?? [])
                    .map((r) => idOf(r.product))
                    .filter(Boolean),
                },
              },
            ]
          : []),
      ],
    },
    limit: 60,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: {
      title: true,
      modelNumber: true,
      price: true,
      compareAtPrice: true,
      categories: true,
      primaryCategory: true,
    },
    req,
  })
  const tree =
    rule.covers.mode === 'categories' ? await categoryAncestors(req.payload, tenantId, req) : null
  const lines: (PromoLine & { title: string; mrp: number | null; model: string | null })[] =
    products
      .map((p) => {
        const cats = [
          idOf(p.primaryCategory),
          ...((p.categories ?? []) as unknown[]).map((c) => idOf(c)),
        ].filter((c): c is string => Boolean(c))
        return {
          key: String(p.id),
          productId: String(p.id),
          variantId: null,
          categoryIds: tree ? [...new Set(cats.flatMap((c) => tree.get(c) ?? [c]))] : cats,
          qty: 1,
          unitMinor: p.price?.amountMinor ?? 0,
          title: p.title,
          mrp: p.compareAtPrice?.amountMinor ?? null,
          model: p.modelNumber ?? null,
        }
      })
      .filter(
        (line) =>
          rule.covers.mode === 'all' ||
          rule.covers.mode === 'products' ||
          line.categoryIds.some((c) => rule.covers.categoryIds.includes(c)),
      )
  const live = { ...rule }
  const until = new Date(scheme.endsAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  })
  const first = lines[0]
  const unit = first ? schemeUnitPrice([live], first) : null
  const sample = lines.slice(0, 2)
  if (rule.type === 'tiered' && sample.length) {
    // Enough of the first product to reach the lowest tier
    const lowest = [...rule.tiers].sort((a, b) => a.minOrderMinor - b.minOrderMinor)[0]
    if (lowest && sample[0]!.unitMinor > 0)
      sample[0] = {
        ...sample[0]!,
        qty: Math.max(1, Math.ceil(lowest.minOrderMinor / sample[0]!.unitMinor)),
      }
  }
  if (rule.type === 'buy-x-get-y' && sample.length) {
    sample.splice(0, sample.length, { ...sample[0]!, qty: rule.buyQty + rule.getQty })
  }
  const result = sample.length ? computePromotions(sample, [live], null, {}) : null
  const gross = sample.reduce((sum, l) => sum + l.unitMinor * l.qty, 0)
  const discount = result ? Object.values(result.lineDiscounts).reduce((a, b) => a + b, 0) : 0
  return {
    card: first
      ? {
          title: first.title,
          modelNumber: first.model,
          priceMinor: unit?.priceMinor ?? first.unitMinor,
          mrpMinor: first.mrp ?? (unit ? first.unitMinor : null),
          badge: rule.badge,
          until,
        }
      : null,
    cart: result
      ? {
          lines: sample.map((l) => ({
            title: l.qty > 1 ? `${l.title} × ${l.qty}` : l.title,
            amountMinor: l.unitMinor * l.qty,
          })),
          discountMinor: discount,
          totalMinor: gross - discount,
          freeShipping: result.freeShipping,
        }
      : null,
  }
}

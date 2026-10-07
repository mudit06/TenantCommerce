import type { Endpoint, PayloadRequest } from 'payload'
import { z } from 'zod'

import { withTransaction } from '@/lib/db/transaction'
import { AppError } from '@/lib/errors'
import { apiHandler, assertSameOrigin, ok, readBody, routeParam } from '@/lib/http/endpoint'

import { assertMarketingAccess } from '../services/access'
import {
  bulkSchema,
  couponInputSchema,
  makeBulkCodes,
  saveCoupon,
  setCouponPaused,
} from '../services/coupons'
import {
  changeSchemeStatus,
  createFromOccasion,
  newSchemeSchema,
  previewScheme,
  statusSchema,
} from '../services/schemes'

// Schemes and Coupons screens (docs/07 "Admin-side custom endpoints"): each checks the person's
// role in the store named in the request and the store's feature switch.

const storeOf = (req: PayloadRequest) => {
  const store = new URL(req.url ?? 'http://x').searchParams.get('store') ?? ''
  if (!store) throw new AppError('VALIDATION_FAILED', 'Which store?', 400)
  return store
}

const csvCell = (value: unknown) => {
  const text = value === null || value === undefined ? '' : String(value)
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

const writer = async (req: PayloadRequest, feature: 'schemes' | 'coupons') => {
  assertSameOrigin(req)
  const tenantId = storeOf(req)
  await assertMarketingAccess(req, tenantId, true, feature)
  return tenantId
}

export const promotionEndpoints: Endpoint[] = [
  {
    path: '/admin/v1/schemes/new',
    method: 'post',
    handler: apiHandler(async (req) => {
      const tenantId = await writer(req, 'schemes')
      const { occasion } = await readBody(req, newSchemeSchema)
      const scheme = await withTransaction(req, () => createFromOccasion(req, tenantId, occasion))
      return ok({ id: scheme.id }, 201)
    }),
  },
  {
    path: '/admin/v1/schemes/:id/status',
    method: 'post',
    handler: apiHandler(async (req) => {
      const tenantId = await writer(req, 'schemes')
      const { action } = await readBody(req, statusSchema)
      const scheme = await withTransaction(req, () =>
        changeSchemeStatus(req, tenantId, routeParam(req, 'id'), action),
      )
      return ok({ id: scheme.id, status: scheme.status })
    }),
  },
  {
    path: '/admin/v1/schemes/:id/preview',
    method: 'get',
    handler: apiHandler(async (req) => {
      const tenantId = storeOf(req)
      await assertMarketingAccess(req, tenantId, false, 'schemes')
      return ok(await previewScheme(req, tenantId, routeParam(req, 'id')))
    }),
  },
  {
    path: '/admin/v1/coupons',
    method: 'post',
    handler: apiHandler(async (req) => {
      const tenantId = await writer(req, 'coupons')
      const input = await readBody(req, couponInputSchema)
      const coupon = await withTransaction(req, () => saveCoupon(req, tenantId, input))
      return ok({ id: coupon.id }, 201)
    }),
  },
  {
    path: '/admin/v1/coupons/bulk',
    method: 'post',
    handler: apiHandler(async (req) => {
      const tenantId = await writer(req, 'coupons')
      const input = await readBody(req, bulkSchema)
      // Not one transaction: a few thousand inserts would outlive it. A failed run leaves the
      // codes made so far, all in one batch
      const result = await makeBulkCodes(req, tenantId, input)
      return ok({ batchId: result.batchId, count: result.codes.length }, 201)
    }),
  },
  {
    path: '/admin/v1/coupons/batch/:batchId',
    method: 'get',
    handler: apiHandler(async (req) => {
      const tenantId = storeOf(req)
      await assertMarketingAccess(req, tenantId, true, 'coupons')
      const batchId = routeParam(req, 'batchId')
      const { docs } = await req.payload.find({
        collection: 'coupons',
        where: { and: [{ tenant: { equals: tenantId } }, { 'batch.id': { equals: batchId } }] },
        sort: 'code',
        depth: 0,
        pagination: false,
        overrideAccess: true,
        select: { code: true, usedCount: true, status: true },
        req,
      })
      const rows = [
        ['Code', 'Used', 'Status'],
        ...docs.map((c) => [c.code, (c.usedCount ?? 0) > 0 ? 'Yes' : 'No', c.status]),
      ]
      return new Response(`﻿${rows.map((r) => r.map(csvCell).join(',')).join('\r\n')}`, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="codes-${batchId}.csv"`,
          'Cache-Control': 'private, no-store',
        },
      })
    }),
  },
  {
    path: '/admin/v1/coupons/:id',
    method: 'post',
    handler: apiHandler(async (req) => {
      const tenantId = await writer(req, 'coupons')
      const input = await readBody(req, couponInputSchema)
      const coupon = await withTransaction(req, () =>
        saveCoupon(req, tenantId, input, routeParam(req, 'id')),
      )
      return ok({ id: coupon.id })
    }),
  },
  {
    path: '/admin/v1/coupons/:id/pause',
    method: 'post',
    handler: apiHandler(async (req) => {
      const tenantId = await writer(req, 'coupons')
      const { paused } = await readBody(req, z.object({ paused: z.boolean() }))
      const coupon = await withTransaction(req, () =>
        setCouponPaused(req, tenantId, routeParam(req, 'id'), paused),
      )
      return ok({ id: coupon.id, status: coupon.status })
    }),
  },
]

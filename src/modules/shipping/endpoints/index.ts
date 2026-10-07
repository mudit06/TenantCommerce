import type { Endpoint, PayloadRequest } from 'payload'
import { z } from 'zod'

import { shiprocketRateSource } from '@/connectors'
import { withTransaction } from '@/lib/db/transaction'
import { AppError } from '@/lib/errors'
import { apiHandler, assertSameOrigin, ok, readBody, routeParam } from '@/lib/http/endpoint'

import {
  assertZoneAccess,
  checkPincode,
  deleteZone,
  saveZone,
  zoneInputSchema,
} from '../services/zones'

// The Shipping zones screen's actions (docs/07 "Admin-side custom endpoints").

const writer = (req: PayloadRequest) => {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 'Sign in first', 401)
  assertSameOrigin(req)
}

const storeSchema = z.object({ store: z.string().min(1) })

export const shippingEndpoints: Endpoint[] = [
  {
    // "Test a pincode": the answer shoppers get, Shiprocket included when connected
    path: '/admin/v1/shipping/check',
    method: 'get',
    handler: apiHandler(async (req) => {
      const params = new URL(req.url ?? 'http://x').searchParams
      const store = params.get('store') ?? ''
      assertZoneAccess(req, store, false)
      const subtotal = Number(params.get('subtotal') ?? 0)
      const result = await checkPincode(req.payload, store, {
        pincode: (params.get('pincode') ?? '').trim(),
        subtotalMinor: Number.isFinite(subtotal) && subtotal >= 0 ? Math.round(subtotal) : 0,
        cod: params.get('cod') === '1',
        live: await shiprocketRateSource(req.payload, store),
      })
      return ok(result)
    }),
  },
  {
    path: '/admin/v1/shipping/zones',
    method: 'post',
    handler: apiHandler(async (req) => {
      writer(req)
      const body = await readBody(req, zoneInputSchema.and(storeSchema))
      const zone = await withTransaction(req, () => saveZone(req, body.store, null, body))
      return ok({ id: zone.id }, 201)
    }),
  },
  {
    path: '/admin/v1/shipping/zones/:id',
    method: 'patch',
    handler: apiHandler(async (req) => {
      writer(req)
      const body = await readBody(req, zoneInputSchema.and(storeSchema))
      const zone = await withTransaction(req, () =>
        saveZone(req, body.store, routeParam(req, 'id'), body),
      )
      return ok({ id: zone.id })
    }),
  },
  {
    path: '/admin/v1/shipping/zones/:id',
    method: 'delete',
    handler: apiHandler(async (req) => {
      writer(req)
      const { store } = await readBody(req, storeSchema)
      await withTransaction(req, () => deleteZone(req, store, routeParam(req, 'id')))
      return ok({ deleted: true })
    }),
  },
]

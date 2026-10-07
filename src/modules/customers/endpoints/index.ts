import type { Endpoint, PayloadRequest } from 'payload'

import { withTransaction } from '@/lib/db/transaction'
import { AppError } from '@/lib/errors'
import { apiHandler, assertSameOrigin, ok, readBody, routeParam } from '@/lib/http/endpoint'
import { toRupeesString } from '@/lib/money'

import { assertCustomerAccess } from '../services/access'
import { customersWhere } from '../services/list'
import {
  exportCustomerData,
  recordPrivacyRequest,
  recordRequestSchema,
  updatePrivacyRequest,
  updateRequestSchema,
} from '../services/privacy'

// The Customers screen's actions (docs/07 "Admin-side custom endpoints"). Each checks the
// person's role in the store named in the request.

const storeOf = (req: PayloadRequest) => {
  const store = new URL(req.url ?? 'http://x').searchParams.get('store') ?? ''
  if (!store) throw new AppError('VALIDATION_FAILED', 'Which store?', 400)
  return store
}

const csvCell = (value: unknown) => {
  const text = value === null || value === undefined ? '' : String(value)
  // A leading = + - @ would run as a formula in Excel (CSV injection)
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

const day = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : ''

export const customerEndpoints: Endpoint[] = [
  {
    path: '/admin/v1/customers/export',
    method: 'get',
    handler: apiHandler(async (req) => {
      const tenantId = storeOf(req)
      assertCustomerAccess(req, tenantId, false)
      const params = new URL(req.url ?? 'http://x').searchParams
      const { docs } = await req.payload.find({
        collection: 'customers',
        where: customersWhere(tenantId, params),
        sort: '-createdAt',
        depth: 0,
        limit: 10_000,
        pagination: false,
        overrideAccess: true,
        select: { passwordHash: false, notes: false },
        req,
      })
      const header = [
        'Name',
        'Email',
        'Phone',
        'Orders',
        'Spent',
        'Last order',
        'Roles',
        'Offers',
        'Joined',
      ]
      const rows = docs.map((c) => [
        c.name,
        c.email,
        c.phone,
        c.ordersCount ?? 0,
        toRupeesString(c.totalSpentMinor ?? 0),
        day(c.lastOrderAt),
        ['Shopper', ...(c.roles ?? []).map((r) => (r === 'affiliate' ? 'Affiliate' : r))].join(
          '; ',
        ),
        [
          c.marketingConsent?.email ? 'Email' : null,
          c.marketingConsent?.whatsapp ? 'WhatsApp' : null,
        ]
          .filter(Boolean)
          .join('; '),
        day(c.createdAt),
      ])
      const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
      return new Response(`﻿${csv}`, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="customers-${new Date().toISOString().slice(0, 10)}.csv"`,
          'Cache-Control': 'private, no-store',
        },
      })
    }),
  },
  {
    path: '/admin/v1/privacy-requests',
    method: 'post',
    handler: apiHandler(async (req) => {
      assertSameOrigin(req)
      const tenantId = storeOf(req)
      assertCustomerAccess(req, tenantId, true)
      const input = await readBody(req, recordRequestSchema)
      const request = await withTransaction(req, () => recordPrivacyRequest(req, tenantId, input))
      return ok({ id: request.id }, 201)
    }),
  },
  {
    path: '/admin/v1/privacy-requests/:id',
    method: 'post',
    handler: apiHandler(async (req) => {
      assertSameOrigin(req)
      const tenantId = storeOf(req)
      assertCustomerAccess(req, tenantId, true)
      const input = await readBody(req, updateRequestSchema)
      const id = routeParam(req, 'id')
      const request = await withTransaction(req, () =>
        updatePrivacyRequest(req, tenantId, id, input),
      )
      return ok({ id: request.id, status: request.status })
    }),
  },
  {
    path: '/admin/v1/privacy-requests/:id/export',
    method: 'get',
    handler: apiHandler(async (req) => {
      const tenantId = storeOf(req)
      // Exports go to the shopper: only owners and managers make one
      assertCustomerAccess(req, tenantId, true)
      const data = await exportCustomerData(req, tenantId, routeParam(req, 'id'))
      return new Response(JSON.stringify(data, null, 2), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="data-export-${new Date().toISOString().slice(0, 10)}.json"`,
          'Cache-Control': 'private, no-store',
        },
      })
    }),
  },
]

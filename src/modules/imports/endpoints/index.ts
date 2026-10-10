import type { Endpoint, PayloadRequest } from 'payload'
import { z } from 'zod'

import { CATALOG_READ, hasTenantRole, storeSessionOf } from '@/access'
import { csvResponse } from '@/lib/csv'
import { isoDate } from '@/lib/dates'
import { withTransaction } from '@/lib/db/transaction'
import { AppError } from '@/lib/errors'
import { apiHandler, assertSameOrigin, ok, readBody, routeParam } from '@/lib/http/endpoint'
import { productFiltersFrom, productsWhere } from '@/modules/catalog'

import { IMPORT_KINDS, TEMPLATES, type ImportKind } from '../constants'
import {
  assertImportAccess,
  cancelImport,
  checkImport,
  errorReport,
  startImport,
} from '../services/jobs'
import { exportProducts } from '../services/export'

// CSV import (docs/07 "Admin-side custom endpoints"): check, import, cancel, the error report
// and the templates. Kept out of the module's index: these import the HTTP helpers.

const storeOf = (req: PayloadRequest) => {
  const store = new URL(req.url ?? 'http://x').searchParams.get('store') ?? ''
  if (!store) throw new AppError('VALIDATION_FAILED', 'Which store?', 400)
  return store
}

const signedIn = (req: PayloadRequest) => {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 'Sign in first', 401)
}

const kinds = IMPORT_KINDS.map((k) => k.value) as [ImportKind, ...ImportKind[]]

export const importEndpoints: Endpoint[] = [
  {
    // Products "Export" and "Export selected" (docs/screens `cms-products`): the import
    // template's columns, so the file can be edited and imported again
    path: '/admin/v1/imports/export/products',
    method: 'get',
    handler: apiHandler(async (req) => {
      signedIn(req)
      const tenantId = storeOf(req)
      const session = storeSessionOf(req.user)
      const allowed = session
        ? session.tenantId === tenantId
        : hasTenantRole(req.user, tenantId, CATALOG_READ)
      if (!allowed) throw new AppError('FORBIDDEN', 'Your role can’t see products', 403)
      const params = new URL(req.url ?? 'http://x').searchParams
      const ids = (params.get('ids') ?? '').split(',').filter(Boolean).slice(0, 1000)
      const where = ids.length
        ? { and: [{ tenant: { equals: tenantId } }, { id: { in: ids } }] }
        : await productsWhere(req.payload, tenantId, productFiltersFrom(params))
      const rows = await exportProducts(req.payload, tenantId, where)
      return csvResponse(rows, `products-${isoDate()}.csv`)
    }),
  },
  {
    path: '/admin/v1/imports',
    method: 'post',
    handler: apiHandler(async (req) => {
      signedIn(req)
      assertSameOrigin(req)
      const tenantId = storeOf(req)
      const input = await readBody(
        req,
        z.object({ kind: z.enum(kinds), filename: z.string().max(200), csv: z.string() }),
      )
      const job = await checkImport(req, tenantId, input)
      return ok({ id: job.id }, 201)
    }),
  },
  {
    path: '/admin/v1/imports/:id/run',
    method: 'post',
    handler: apiHandler(async (req) => {
      signedIn(req)
      assertSameOrigin(req)
      const tenantId = storeOf(req)
      await withTransaction(req, () => startImport(req, tenantId, routeParam(req, 'id')))
      return ok({ queued: true })
    }),
  },
  {
    path: '/admin/v1/imports/:id/cancel',
    method: 'post',
    handler: apiHandler(async (req) => {
      signedIn(req)
      assertSameOrigin(req)
      const tenantId = storeOf(req)
      await cancelImport(req, tenantId, routeParam(req, 'id'))
      return ok({ cancelled: true })
    }),
  },
  {
    path: '/admin/v1/imports/:id/errors.csv',
    method: 'get',
    handler: apiHandler(async (req) => {
      signedIn(req)
      const tenantId = storeOf(req)
      const report = await errorReport(req.payload, tenantId, routeParam(req, 'id'))
      await assertImportAccess(req, tenantId, report.kind)
      return new Response(report.csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${report.filename.replace(/"/g, '')}"`,
          'Cache-Control': 'private, no-store',
        },
      })
    }),
  },
  {
    path: '/admin/v1/imports/template',
    method: 'get',
    handler: apiHandler(async (req) => {
      signedIn(req)
      const kind = new URL(req.url ?? 'http://x').searchParams.get('kind') as ImportKind
      const template = TEMPLATES[kind]
      if (!template) throw new AppError('NOT_FOUND', 'No such template', 404)
      return csvResponse([template.columns, ...template.sample], `${kind}-template.csv`)
    }),
  },
]

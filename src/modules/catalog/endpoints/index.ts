import type { Endpoint, PayloadRequest } from 'payload'

import {
  CATALOG_READ,
  CATALOG_WRITE,
  hasTenantRole,
  idOf,
  isPlatformStaff,
  isSuperAdmin,
} from '@/access'
import { withTransaction } from '@/lib/db/transaction'
import { AppError } from '@/lib/errors'
import { apiHandler, assertSameOrigin, ok, routeParam } from '@/lib/http/endpoint'
import type { Product } from '@/payload-types'

import { attributeSetForCategory } from '../services/catalogLookup'
import { axesForProduct, generateVariants } from '../services/variants'

async function loadForUser(
  req: PayloadRequest,
  collection: 'products' | 'categories',
  id: string,
  write: boolean,
) {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 'Sign in first', 401)
  const doc = await req.payload
    .findByID({ collection, id, depth: 0, overrideAccess: true, req })
    .catch(() => null)
  const tenantId = idOf(doc?.tenant)
  const allowed =
    tenantId &&
    (write
      ? isSuperAdmin(req.user) || hasTenantRole(req.user, tenantId, CATALOG_WRITE)
      : isPlatformStaff(req.user) || hasTenantRole(req.user, tenantId, CATALOG_READ))
  if (!doc || !allowed) throw new AppError('NOT_FOUND', 'Not found', 404)
  return doc
}

/** Helpers for the product editor (docs/07 admin endpoints). */
export const catalogEndpoints: Endpoint[] = [
  {
    path: '/admin/v1/catalog/categories/:id/attribute-set',
    method: 'get',
    handler: apiHandler(async (req) => {
      const category = await loadForUser(req, 'categories', routeParam(req, 'id'), false)
      const set = await attributeSetForCategory(req.payload, String(category.id), req)
      return ok({
        attributeSet: set ? { id: set.id, name: set.name, attributes: set.attributes ?? [] } : null,
      })
    }),
  },
  {
    path: '/admin/v1/catalog/products/:id/variant-axes',
    method: 'get',
    handler: apiHandler(async (req) => {
      const product = (await loadForUser(req, 'products', routeParam(req, 'id'), false)) as Product
      return ok({ axes: await axesForProduct(req, product) })
    }),
  },
  {
    path: '/admin/v1/catalog/products/:id/variants/generate',
    method: 'post',
    handler: apiHandler(async (req) => {
      assertSameOrigin(req)
      const product = (await loadForUser(req, 'products', routeParam(req, 'id'), true)) as Product
      const result = await withTransaction(req, () => generateVariants(req, product))
      return ok(result, 201)
    }),
  },
]

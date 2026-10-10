import type { Endpoint, PayloadRequest } from 'payload'
import { z } from 'zod'

import {
  CATALOG_READ,
  CATALOG_WRITE,
  hasTenantRole,
  idOf,
  isPlatformStaff,
  isSuperAdmin,
  storeSessionOf,
} from '@/access'
import { withTransaction } from '@/lib/db/transaction'
import { AppError } from '@/lib/errors'
import { apiHandler, assertSameOrigin, ok, readBody, routeParam } from '@/lib/http/endpoint'
import type { Product } from '@/payload-types'

import { attributeSetForCategory } from '../services/catalogLookup'
import { moveCategory } from '../services/categoryTree'
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

/** Catalog changes in one store: its catalog roles, or our team managing it (docs/05). */
function assertCatalogWrite(req: PayloadRequest, tenantId: string) {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 'Sign in first', 401)
  const session = storeSessionOf(req.user)
  const allowed = session
    ? session.tenantId === tenantId && session.mode === 'manage'
    : hasTenantRole(req.user, tenantId, CATALOG_WRITE)
  if (!allowed) throw new AppError('FORBIDDEN', 'Your role can’t change products', 403)
}

const bulkSchema = z.object({
  store: z.string().min(1),
  ids: z.array(z.string().min(1)).min(1).max(200),
  action: z.enum(['publish', 'archive', 'draft', 'category']),
  categoryId: z.string().optional(),
})

const moveSchema = z.object({
  parent: z.string().min(1).nullable(),
  index: z.number().int().min(0).max(10_000),
})

/** Helpers for the product editor and the Products list (docs/07 admin endpoints). */
export const catalogEndpoints: Endpoint[] = [
  {
    // Categories tree: drag to reorder or nest (docs/screens `cms-categories` rule 3)
    path: '/admin/v1/catalog/categories/:id/move',
    method: 'post',
    handler: apiHandler(async (req) => {
      assertSameOrigin(req)
      const category = await loadForUser(req, 'categories', routeParam(req, 'id'), true)
      const tenantId = idOf(category.tenant)!
      assertCatalogWrite(req, tenantId)
      const input = await readBody(req, moveSchema)
      await withTransaction(req, () =>
        moveCategory(req, { id: String(category.id), tenantId, ...input }),
      )
      return ok({ moved: true })
    }),
  },
  {
    // Products list bulk actions (docs/screens `cms-products`): each product is saved with the
    // person's own access, so the usual checks apply (no photo, no going active) and the ones
    // that can't change are listed with why.
    path: '/admin/v1/catalog/products/bulk',
    method: 'post',
    handler: apiHandler(async (req) => {
      assertSameOrigin(req)
      const input = await readBody(req, bulkSchema)
      assertCatalogWrite(req, input.store)
      if (input.action === 'category') {
        const category = await req.payload
          .findByID({
            collection: 'categories',
            id: input.categoryId ?? '',
            depth: 0,
            overrideAccess: true,
            req,
          })
          .catch(() => null)
        if (!category || idOf(category.tenant) !== input.store) {
          throw new AppError('VALIDATION_FAILED', 'Choose a category', 400, {
            categoryId: 'Choose a category',
          })
        }
      }
      const data =
        input.action === 'category'
          ? { primaryCategory: input.categoryId }
          : {
              status:
                input.action === 'publish'
                  ? 'active'
                  : input.action === 'archive'
                    ? 'archived'
                    : 'draft',
            }
      let changed = 0
      const failed: { id: string; title: string; reason: string }[] = []
      for (const id of input.ids) {
        const product = await req.payload
          .findByID({ collection: 'products', id, depth: 0, overrideAccess: true, req })
          .catch(() => null)
        if (!product || idOf(product.tenant) !== input.store) continue
        try {
          await withTransaction(req, () =>
            req.payload.update({
              collection: 'products',
              id,
              data: data as never,
              overrideAccess: false,
              user: req.user,
              req,
            }),
          )
          changed += 1
        } catch (error) {
          failed.push({
            id,
            title: product.title,
            reason: error instanceof Error ? error.message : 'Couldn’t be changed',
          })
        }
      }
      return ok({ changed, failed })
    }),
  },
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

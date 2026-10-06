import type { Endpoint } from 'payload'
import { z } from 'zod'

import { withTransaction } from '@/lib/db/transaction'
import { AppError } from '@/lib/errors'
import { apiHandler, assertSameOrigin, ok, readBody, routeParam } from '@/lib/http/endpoint'
import { codRulesSchema, saveCodRules } from '@/modules/content'

import {
  assertCanEditConnectors,
  connectorAllowedSchema,
  saveConnector,
  saveConnectorSchema,
  setConnectorAllowed,
  testConnector,
} from './service'

const requireUser = (req: Parameters<Endpoint['handler']>[0]) => {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 'Sign in first', 401)
  assertSameOrigin(req)
}

const testSchema = z.object({ tenantId: z.string().min(1) })

/** Connector setup (docs/07 "/connectors/:provider/test" and the Connectors tab switch). */
export const connectorEndpoints: Endpoint[] = [
  {
    // Cash on delivery rules on the Payments screen: owner-only, like the keys beside them
    path: '/admin/v1/payments/cod',
    method: 'post',
    handler: apiHandler(async (req) => {
      requireUser(req)
      const input = await readBody(req, codRulesSchema)
      assertCanEditConnectors(req, input.tenantId)
      return ok(await withTransaction(req, () => saveCodRules(req, input)))
    }),
  },
  {
    path: '/admin/v1/connectors/:provider',
    method: 'post',
    handler: apiHandler(async (req) => {
      requireUser(req)
      const provider = routeParam(req, 'provider')
      const input = await readBody(req, saveConnectorSchema)
      const result = await withTransaction(req, () => saveConnector(req, provider, input))
      return ok(result)
    }),
  },
  {
    path: '/admin/v1/connectors/:provider/test',
    method: 'post',
    handler: apiHandler(async (req) => {
      requireUser(req)
      const provider = routeParam(req, 'provider')
      const { tenantId } = await readBody(req, testSchema)
      // No transaction: the provider call can take seconds and changes nothing of ours but health
      return ok(await testConnector(req, provider, tenantId))
    }),
  },
  {
    path: '/admin/v1/platform/tenants/:id/connectors/:provider',
    method: 'patch',
    handler: apiHandler(async (req) => {
      requireUser(req)
      const tenantId = routeParam(req, 'id')
      const provider = routeParam(req, 'provider')
      const { allowed } = await readBody(req, connectorAllowedSchema)
      const result = await withTransaction(req, () =>
        setConnectorAllowed(req, tenantId, provider, allowed),
      )
      return ok(result)
    }),
  },
]

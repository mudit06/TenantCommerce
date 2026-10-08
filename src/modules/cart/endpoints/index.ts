import type { Endpoint } from 'payload'

import { withTransaction } from '@/lib/db/transaction'
import { AppError } from '@/lib/errors'
import { apiHandler, assertSameOrigin, ok, readBody } from '@/lib/http/endpoint'

import {
  abandonedSettingsSchema,
  assertCartsAccess,
  saveAbandonedSettings,
} from '../services/settings'

// Abandoned carts (docs/07 "Admin-side custom endpoints"). Kept out of the module's index: these
// import the HTTP helpers, which read the environment at load.

export const cartEndpoints: Endpoint[] = [
  {
    path: '/admin/v1/carts/settings',
    method: 'post',
    handler: apiHandler(async (req) => {
      if (!req.user) throw new AppError('UNAUTHENTICATED', 'Sign in first', 401)
      assertSameOrigin(req)
      const tenantId = new URL(req.url ?? 'http://x').searchParams.get('store') ?? ''
      if (!tenantId) throw new AppError('VALIDATION_FAILED', 'Which store?', 400)
      await assertCartsAccess(req, tenantId, 'write')
      const input = await readBody(req, abandonedSettingsSchema)
      await withTransaction(req, () => saveAbandonedSettings(req, tenantId, input))
      return ok({ saved: true })
    }),
  },
]

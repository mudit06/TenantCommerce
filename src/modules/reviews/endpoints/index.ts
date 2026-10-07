import type { Endpoint, PayloadRequest } from 'payload'

import { withTransaction } from '@/lib/db/transaction'
import { AppError } from '@/lib/errors'
import { apiHandler, assertSameOrigin, ok, readBody, routeParam } from '@/lib/http/endpoint'

import { assertReviewAccess } from '../services/access'
import {
  moderateReview,
  moderateSchema,
  saveReviewSettings,
  settingsSchema,
} from '../services/moderate'

// The Reviews screen's actions (docs/07): approve, reject with a reason, reply; settings.

const storeOf = (req: PayloadRequest) => {
  const store = new URL(req.url ?? 'http://x').searchParams.get('store') ?? ''
  if (!store) throw new AppError('VALIDATION_FAILED', 'Which store?', 400)
  return store
}

export const reviewEndpoints: Endpoint[] = [
  {
    path: '/admin/v1/reviews/settings',
    method: 'post',
    handler: apiHandler(async (req) => {
      assertSameOrigin(req)
      const tenantId = storeOf(req)
      await assertReviewAccess(req, tenantId, 'settings')
      const input = await readBody(req, settingsSchema)
      await withTransaction(req, () => saveReviewSettings(req, tenantId, input))
      return ok({ saved: true })
    }),
  },
  {
    path: '/admin/v1/reviews/:id',
    method: 'post',
    handler: apiHandler(async (req) => {
      assertSameOrigin(req)
      const tenantId = storeOf(req)
      await assertReviewAccess(req, tenantId, 'moderate')
      const input = await readBody(req, moderateSchema)
      const review = await withTransaction(req, () =>
        moderateReview(req, tenantId, routeParam(req, 'id'), input),
      )
      return ok({ id: review.id, status: review.status })
    }),
  },
]

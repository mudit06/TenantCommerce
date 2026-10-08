import type { Endpoint, PayloadRequest } from 'payload'
import { z } from 'zod'

import { withTransaction } from '@/lib/db/transaction'
import { AppError } from '@/lib/errors'
import { apiHandler, assertSameOrigin, ok, readBody, routeParam } from '@/lib/http/endpoint'

import {
  assertCampaignAccess,
  campaignAudience,
  campaignInputSchema,
  offerSettingsSchema,
  saveCampaign,
  saveOfferSettings,
  sendCampaignTest,
  setCampaignStatus,
} from '../services/campaigns'
import { resendMessage, sendTest, testInputSchema } from '../services/messages'
import { saveSettings, settingsInputSchema } from '../services/settings'
import { submitTemplates, syncTemplates } from '../services/templates'
import { handleWhatsAppWebhook, verifyHandshake } from '../services/webhook'

// Order updates (docs/07 "Admin-side custom endpoints" and "Webhooks in"). Kept out of the
// module's index: these import the HTTP helpers, which read the environment at load.

const writer = (req: PayloadRequest) => {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 'Sign in first', 401)
  assertSameOrigin(req)
}

const storeSchema = z.object({ store: z.string().min(1) })

const storeOf = (req: PayloadRequest) => {
  const store = new URL(req.url ?? 'http://x').searchParams.get('store') ?? ''
  if (!store) throw new AppError('VALIDATION_FAILED', 'Which store?', 400)
  return store
}

// Offer messages (docs/screens Offer messages)
const campaignEndpoints: Endpoint[] = [
  {
    path: '/admin/v1/offer-campaigns/audience',
    method: 'post',
    handler: apiHandler(async (req) => {
      writer(req)
      const tenantId = storeOf(req)
      await assertCampaignAccess(req, tenantId, 'read')
      const body = await readBody(
        req,
        z.object({
          channels: z.array(z.enum(['email', 'whatsapp'])),
          audience: z.enum(['all', 'wishlist', 'lapsed']),
          scheme: z.string().nullable().optional(),
        }),
      )
      const { recipients, capped } = await campaignAudience(req, tenantId, body)
      return ok({
        email: recipients.filter((r) => r.channel === 'email').length,
        whatsapp: recipients.filter((r) => r.channel === 'whatsapp').length,
        capped,
      })
    }),
  },
  {
    path: '/admin/v1/offer-campaigns/settings',
    method: 'post',
    handler: apiHandler(async (req) => {
      writer(req)
      const tenantId = storeOf(req)
      await assertCampaignAccess(req, tenantId, 'settings')
      const input = await readBody(req, offerSettingsSchema)
      await withTransaction(req, () => saveOfferSettings(req, tenantId, input))
      return ok({ saved: true })
    }),
  },
  {
    path: '/admin/v1/offer-campaigns',
    method: 'post',
    handler: apiHandler(async (req) => {
      writer(req)
      const tenantId = storeOf(req)
      await assertCampaignAccess(req, tenantId, 'write')
      const input = await readBody(req, campaignInputSchema)
      const campaign = await withTransaction(req, () => saveCampaign(req, tenantId, input))
      return ok({ id: campaign.id }, 201)
    }),
  },
  {
    path: '/admin/v1/offer-campaigns/:id',
    method: 'post',
    handler: apiHandler(async (req) => {
      writer(req)
      const tenantId = storeOf(req)
      await assertCampaignAccess(req, tenantId, 'write')
      const input = await readBody(req, campaignInputSchema)
      const campaign = await withTransaction(req, () =>
        saveCampaign(req, tenantId, input, routeParam(req, 'id')),
      )
      return ok({ id: campaign.id })
    }),
  },
  {
    path: '/admin/v1/offer-campaigns/:id/status',
    method: 'post',
    handler: apiHandler(async (req) => {
      writer(req)
      const tenantId = storeOf(req)
      await assertCampaignAccess(req, tenantId, 'write')
      const { action } = await readBody(req, z.object({ action: z.enum(['schedule', 'cancel']) }))
      const campaign = await withTransaction(req, () =>
        setCampaignStatus(req, tenantId, routeParam(req, 'id'), action),
      )
      return ok({ id: campaign.id, status: campaign.status, sendAt: campaign.sendAt })
    }),
  },
  {
    path: '/admin/v1/offer-campaigns/:id/test',
    method: 'post',
    handler: apiHandler(async (req) => {
      writer(req)
      const tenantId = storeOf(req)
      await assertCampaignAccess(req, tenantId, 'write')
      const to = String((req.user as { email?: string } | null)?.email ?? '')
      if (!to) throw new AppError('VALIDATION_FAILED', 'Your account has no email', 400)
      await withTransaction(req, () => sendCampaignTest(req, tenantId, routeParam(req, 'id'), to))
      return ok({ to })
    }),
  },
]

export const notificationEndpoints: Endpoint[] = [
  ...campaignEndpoints,
  {
    path: '/admin/v1/notifications/settings',
    method: 'post',
    handler: apiHandler(async (req) => {
      writer(req)
      const body = await readBody(req, settingsInputSchema.and(storeSchema))
      await withTransaction(req, () => saveSettings(req, body.store, body))
      return ok({ saved: true })
    }),
  },
  {
    path: '/admin/v1/notifications/test',
    method: 'post',
    handler: apiHandler(async (req) => {
      writer(req)
      const body = await readBody(req, testInputSchema)
      // No transaction: the provider call is made here and the screen shows the outcome
      return ok(await sendTest(req, body))
    }),
  },
  {
    path: '/admin/v1/notifications/templates/submit',
    method: 'post',
    handler: apiHandler(async (req) => {
      writer(req)
      const { store } = await readBody(req, storeSchema)
      return ok(await submitTemplates(req, store))
    }),
  },
  {
    path: '/admin/v1/notifications/templates/sync',
    method: 'post',
    handler: apiHandler(async (req) => {
      writer(req)
      const { store } = await readBody(req, storeSchema)
      return ok(await syncTemplates(req, store))
    }),
  },
  {
    path: '/admin/v1/orders/:id/messages/:logId/resend',
    method: 'post',
    handler: apiHandler(async (req) => {
      writer(req)
      const log = await withTransaction(req, () =>
        resendMessage(req, routeParam(req, 'id'), routeParam(req, 'logId')),
      )
      return ok({ id: log.id }, 201)
    }),
  },
  {
    // Meta's handshake when the webhook is added: answer the challenge as plain text
    path: '/webhooks/whatsapp/:tenantId',
    method: 'get',
    handler: async (req) => {
      const tenantId = String(req.routeParams?.tenantId ?? '')
      const params = new URL(req.url ?? 'http://x').searchParams
      const challenge = await verifyHandshake(req, tenantId, params).catch(() => null)
      return challenge
        ? new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } })
        : new Response('Forbidden', { status: 403 })
    },
  },
  {
    // Receipts, replies and template approvals. A wrong signature answers 401 so Meta's
    // dashboard shows it; a failure on our side answers 500 so Meta retries.
    path: '/webhooks/whatsapp/:tenantId',
    method: 'post',
    handler: async (req) => {
      const tenantId = String(req.routeParams?.tenantId ?? '')
      const rawBody = req.text ? await req.text() : ''
      try {
        const outcome = await withTransaction(req, () =>
          handleWhatsAppWebhook(req, tenantId, {
            rawBody,
            signature: req.headers.get('x-hub-signature-256'),
          }),
        )
        return Response.json(
          { ok: outcome !== 'bad-signature', outcome },
          { status: outcome === 'bad-signature' ? 401 : 200 },
        )
      } catch (error) {
        req.payload.logger.error({ err: error, msg: 'WhatsApp webhook failed', tenantId })
        return Response.json({ ok: false }, { status: 500 })
      }
    },
  },
]

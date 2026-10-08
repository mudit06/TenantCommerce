import { createHmac, timingSafeEqual } from 'node:crypto'

import { env } from '@/lib/env'

import { providerFetch } from '../../core/http'
import type { ConnectorContext, ConnectorImplementation, TestResult } from '../../core/types'

// WhatsApp Cloud API on the vendor's own Meta account (docs/09 "WhatsApp: Meta Cloud API").

export const graphUrl = (path: string) =>
  `https://graph.facebook.com/${env.META_GRAPH_API_VERSION}/${path.replace(/^\//, '')}`

type PhoneNumber = {
  display_phone_number?: string
  verified_name?: string
  quality_rating?: string
  messaging_limit_tier?: string
  name_status?: string
}
type GraphError = { error?: { message?: string; code?: number } }

/** Meta's tier names, as the owner reads them on WhatsApp and SMS */
const LIMIT_TIERS: Record<string, string> = {
  TIER_50: '50 shoppers a day',
  TIER_250: '250 shoppers a day',
  TIER_1K: '1,000 shoppers a day',
  TIER_2K: '2,000 shoppers a day',
  TIER_10K: '10,000 shoppers a day',
  TIER_100K: '1,00,000 shoppers a day',
  TIER_UNLIMITED: 'No daily limit',
}

async function testCredentials(ctx: ConnectorContext): Promise<TestResult> {
  const fields =
    'display_phone_number,verified_name,quality_rating,messaging_limit_tier,name_status'
  const response = await providerFetch<PhoneNumber & GraphError>(
    graphUrl(`${encodeURIComponent(ctx.public.phoneNumberId ?? '')}?fields=${fields}`),
    {
      provider: 'Meta',
      headers: { Authorization: `Bearer ${ctx.secret.accessToken ?? ''}` },
      fetchImpl: ctx.fetchImpl,
    },
  )
  const json = response.json
  if (!response.ok || !json) {
    const reason = json?.error?.message ?? `error ${response.status}`
    return {
      ok: false,
      message:
        response.status === 401 || json?.error?.code === 190
          ? 'Meta refused the access token. Create a new system user token and paste it again.'
          : `Meta could not open this phone number ID: ${reason}`,
    }
  }
  const quality = json.quality_rating?.toLowerCase() ?? 'unknown'
  return {
    ok: true,
    message: `Connected to ${json.display_phone_number ?? 'the number'} (${json.verified_name ?? 'no display name yet'}).`,
    details: {
      displayPhone: json.display_phone_number ?? null,
      verifiedName: json.verified_name ?? null,
      quality,
      nameStatus: json.name_status ?? null,
      messagingLimit: json.messaging_limit_tier
        ? (LIMIT_TIERS[json.messaging_limit_tier] ?? json.messaging_limit_tier)
        : null,
    },
  }
}

export const whatsappMeta: ConnectorImplementation = { testCredentials }

// ---- Sending, templates and webhooks (docs/09 "WhatsApp: Meta Cloud API", docs/18) ----------

export type SendResult =
  { ok: true; messageId: string } | { ok: false; code: string; message: string; retryable: boolean }

type GraphSendResponse = { messages?: { id?: string }[] } & GraphError

const authHeaders = (ctx: ConnectorContext) => ({
  Authorization: `Bearer ${ctx.secret.accessToken ?? ''}`,
})

/** Meta's error, as one line for the order's Messages panel (never the token) */
function sendFailure(status: number, json: GraphError | null): SendResult {
  const code = json?.error?.code
  return {
    ok: false,
    code: code ? String(code) : `http_${status}`,
    message: json?.error?.message?.slice(0, 200) ?? `Meta answered ${status}`,
    // Rate limits and Meta's own errors are worth another try; a bad number or template isn't
    retryable: status >= 500 || status === 429 || code === 130429 || code === 131000,
  }
}

/** Indian mobile in E.164 to the digits Meta wants: +919876543210 -> 919876543210 */
const graphPhone = (e164: string) => e164.replace(/^\+/, '')

/** An approved template with its body variables and the "Track order" button's path suffix */
export async function sendTemplate(
  ctx: ConnectorContext,
  input: {
    to: string
    name: string
    language: string
    bodyParams: string[]
    buttonParam?: string | null
  },
): Promise<SendResult> {
  const components: unknown[] = [
    {
      type: 'body',
      parameters: input.bodyParams.map((text) => ({ type: 'text', text })),
    },
  ]
  if (input.buttonParam) {
    components.push({
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: [{ type: 'text', text: input.buttonParam }],
    })
  }
  const response = await providerFetch<GraphSendResponse>(
    graphUrl(`${encodeURIComponent(ctx.public.phoneNumberId ?? '')}/messages`),
    {
      provider: 'Meta',
      method: 'POST',
      headers: authHeaders(ctx),
      body: {
        messaging_product: 'whatsapp',
        to: graphPhone(input.to),
        type: 'template',
        template: { name: input.name, language: { code: input.language }, components },
      },
      fetchImpl: ctx.fetchImpl,
    },
  )
  const id = response.json?.messages?.[0]?.id
  if (response.ok && id) return { ok: true, messageId: id }
  return sendFailure(response.status, response.json)
}

/** Free text, only inside the 24 hours after the shopper wrote to us (the automatic answer) */
export async function sendText(
  ctx: ConnectorContext,
  input: { to: string; text: string },
): Promise<SendResult> {
  const response = await providerFetch<GraphSendResponse>(
    graphUrl(`${encodeURIComponent(ctx.public.phoneNumberId ?? '')}/messages`),
    {
      provider: 'Meta',
      method: 'POST',
      headers: authHeaders(ctx),
      body: {
        messaging_product: 'whatsapp',
        to: graphPhone(input.to),
        type: 'text',
        text: { body: input.text.slice(0, 1000), preview_url: false },
      },
      fetchImpl: ctx.fetchImpl,
    },
  )
  const id = response.json?.messages?.[0]?.id
  if (response.ok && id) return { ok: true, messageId: id }
  return sendFailure(response.status, response.json)
}

export type MetaTemplate = {
  id: string
  name: string
  language: string
  status: string
  category?: string
  rejectedReason?: string
}

type GraphTemplateList = {
  data?: {
    id?: string
    name?: string
    language?: string
    status?: string
    category?: string
    rejected_reason?: string
  }[]
  paging?: { next?: string }
} & GraphError

/** Every template on the vendor's WhatsApp Business account, with Meta's status */
export async function listTemplates(ctx: ConnectorContext): Promise<MetaTemplate[]> {
  const out: MetaTemplate[] = []
  let url: string | undefined = graphUrl(
    `${encodeURIComponent(ctx.public.wabaId ?? '')}/message_templates?fields=id,name,language,status,category,rejected_reason&limit=100`,
  )
  for (let page = 0; url && page < 10; page++) {
    const response: Awaited<ReturnType<typeof providerFetch<GraphTemplateList>>> =
      await providerFetch<GraphTemplateList>(url, {
        provider: 'Meta',
        headers: authHeaders(ctx),
        fetchImpl: ctx.fetchImpl,
      })
    if (!response.ok || !response.json) {
      throw new Error(response.json?.error?.message ?? `Meta answered ${response.status}`)
    }
    for (const row of response.json.data ?? []) {
      if (!row.id || !row.name) continue
      out.push({
        id: row.id,
        name: row.name,
        language: row.language ?? 'en',
        status: row.status ?? 'PENDING',
        category: row.category,
        rejectedReason:
          row.rejected_reason && row.rejected_reason !== 'NONE' ? row.rejected_reason : undefined,
      })
    }
    url = response.json.paging?.next
  }
  return out
}

/** Submits a utility template for Meta's review, with sample values for every variable */
export async function createTemplate(
  ctx: ConnectorContext,
  input: {
    name: string
    language: string
    category: 'UTILITY' | 'MARKETING'
    body: string
    samples: string[]
    /** Fixed part of the "Track order" link; Meta adds the variable suffix */
    trackUrlBase?: string | null
    trackSample?: string
    /** The URL button's text: "Track order" for order updates, "Shop the offer" for offers */
    buttonText?: string
  },
): Promise<{ ok: true; id: string; status: string } | { ok: false; message: string }> {
  const components: unknown[] = [
    { type: 'BODY', text: input.body, example: { body_text: [input.samples] } },
  ]
  if (input.trackUrlBase) {
    components.push({
      type: 'BUTTONS',
      buttons: [
        {
          type: 'URL',
          text: input.buttonText ?? 'Track order',
          url: `${input.trackUrlBase}{{1}}`,
          example: [`${input.trackUrlBase}${input.trackSample ?? 'K7Q2M9XW4P'}`],
        },
      ],
    })
  }
  const response = await providerFetch<{ id?: string; status?: string } & GraphError>(
    graphUrl(`${encodeURIComponent(ctx.public.wabaId ?? '')}/message_templates`),
    {
      provider: 'Meta',
      method: 'POST',
      headers: authHeaders(ctx),
      body: {
        name: input.name,
        language: input.language,
        category: input.category,
        components,
      },
      fetchImpl: ctx.fetchImpl,
    },
  )
  if (response.ok && response.json?.id) {
    return { ok: true, id: response.json.id, status: response.json.status ?? 'PENDING' }
  }
  return {
    ok: false,
    message: response.json?.error?.message ?? `Meta answered ${response.status}`,
  }
}

/** `X-Hub-Signature-256: sha256=<hex>` over the raw body, with the vendor's app secret */
export function verifySignature(
  appSecret: string,
  rawBody: string,
  header: string | null,
): boolean {
  if (!appSecret || !header?.startsWith('sha256=')) return false
  const expected = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest()
  const given = Buffer.from(header.slice('sha256='.length), 'hex')
  return given.length === expected.length && timingSafeEqual(given, expected)
}

/** Meta's template status to ours */
export function templateStatusOf(metaStatus: string): string {
  switch (metaStatus.toUpperCase()) {
    case 'APPROVED':
      return 'approved'
    case 'REJECTED':
      return 'rejected'
    case 'PAUSED':
      return 'paused'
    case 'DISABLED':
    case 'DELETED':
    case 'ARCHIVED':
      return 'disabled'
    default:
      return 'submitted'
  }
}

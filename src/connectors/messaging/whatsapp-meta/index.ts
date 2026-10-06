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

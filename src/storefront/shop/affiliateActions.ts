'use server'

import { createLocalReq } from 'payload'
import { ZodError } from 'zod'

import { getPayloadClient } from '@/lib/data/payload'
import { withTransaction } from '@/lib/db/transaction'
import { isAppError } from '@/lib/errors'
import { allow, LIMITS } from '@/lib/rate-limit'
import {
  affiliateOfCustomer,
  applyAsAffiliate,
  savePayoutDetails,
  type ApplicationInput,
} from '@/modules/affiliate'
import { isFeatureEnabled } from '@/modules/tenancy'

import { signedInShopper } from './account'
import { currentStore } from './server'

// The affiliate program on the storefront (docs/screens storefront `st-affiliate`,
// `st-affiliate-dash`): applying and payout details, for the signed-in shopper's own record only.

export type AffiliateResult =
  { ok: true } | { ok: false; message: string; fields?: Record<string, string> }

function failure(error: unknown): AffiliateResult {
  if (error instanceof ZodError) {
    const fields: Record<string, string> = {}
    for (const issue of error.issues) fields[issue.path.join('.')] ??= issue.message
    return { ok: false, message: Object.values(fields)[0] ?? 'Please check the form.', fields }
  }
  if (isAppError(error)) return { ok: false, message: error.message, fields: error.fields }
  console.error('[affiliate] action failed', error)
  return { ok: false, message: 'Something went wrong. Please try again.' }
}

async function me() {
  const store = await currentStore()
  if (!store) return { error: 'This store isn’t open at the moment.' }
  const payload = await getPayloadClient()
  if (!(await isFeatureEnabled(payload, store.tenantId, 'affiliate'))) {
    return { error: 'This store has no affiliate program.' }
  }
  const session = await signedInShopper(store.tenantId)
  if (!session) return { error: 'Your session has ended. Please log in again.' }
  const req = await createLocalReq({}, payload)
  return { store, payload, req, customer: session.customer }
}

export async function applyForAffiliate(input: ApplicationInput): Promise<AffiliateResult> {
  try {
    const ctx = await me()
    if ('error' in ctx) return { ok: false, message: ctx.error! }
    if (!allow(`affiliate-apply:${ctx.customer.id}`, LIMITS.enquiry)) {
      return { ok: false, message: 'Please wait a minute and try again.' }
    }
    await withTransaction(ctx.req, () =>
      applyAsAffiliate(
        ctx.req,
        ctx.store.tenantId,
        { id: String(ctx.customer.id), email: ctx.customer.email },
        input,
      ),
    )
    return { ok: true }
  } catch (error) {
    return failure(error)
  }
}

export async function saveMyPayoutDetails(input: unknown): Promise<AffiliateResult> {
  try {
    const ctx = await me()
    if ('error' in ctx) return { ok: false, message: ctx.error! }
    const affiliate = await affiliateOfCustomer(
      ctx.payload,
      ctx.store.tenantId,
      String(ctx.customer.id),
    )
    if (!affiliate || affiliate.status === 'applied' || affiliate.status === 'rejected') {
      return { ok: false, message: 'Payout details are for approved affiliates.' }
    }
    await withTransaction(ctx.req, () =>
      savePayoutDetails(
        ctx.req,
        ctx.store.tenantId,
        affiliate,
        input as Parameters<typeof savePayoutDetails>[3],
      ),
    )
    return { ok: true }
  } catch (error) {
    return failure(error)
  }
}

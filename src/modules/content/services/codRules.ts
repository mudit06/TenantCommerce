import type { Payload, PayloadRequest } from 'payload'
import { z } from 'zod'

import { AppError } from '@/lib/errors'

// Cash on delivery rules on the Payments screen (docs/09 "COD", docs/screens Payments). They live
// in the store's settings; whether COD is offered at all also needs the platform's `cod` switch.

const paise = z.number().int().min(0).max(100_000_000_00)

export const codRulesSchema = z
  .object({
    tenantId: z.string().min(1),
    codEnabled: z.boolean(),
    codMinOrderMinor: paise.nullable(),
    codMaxOrderMinor: paise.nullable(),
    codFeeMinor: paise.nullable(),
  })
  .refine(
    (rules) =>
      rules.codMinOrderMinor === null ||
      rules.codMaxOrderMinor === null ||
      rules.codMinOrderMinor <= rules.codMaxOrderMinor,
    { path: ['codMaxOrderMinor'], message: 'The maximum must be at least the minimum' },
  )
export type CodRulesInput = z.infer<typeof codRulesSchema>

export type CodRules = {
  codEnabled: boolean
  codMinOrderMinor: number | null
  codMaxOrderMinor: number | null
  codFeeMinor: number | null
}

const money = (amountMinor: number | null) =>
  amountMinor === null
    ? { amountMinor: null, currency: 'INR' as const }
    : { amountMinor, currency: 'INR' as const }

async function settingsOf(payload: Payload, tenantId: string, req?: PayloadRequest) {
  const { docs } = await payload.find({
    collection: 'site-settings',
    where: { tenant: { equals: tenantId } },
    limit: 1,
    depth: 0,
    // Inside a transaction: a paginated find counts in parallel, which Mongo refuses
    pagination: false,
    overrideAccess: true,
    req,
  })
  return docs[0] ?? null
}

export async function getCodRules(payload: Payload, tenantId: string): Promise<CodRules> {
  const checkout = (await settingsOf(payload, tenantId))?.checkout
  return {
    codEnabled: Boolean(checkout?.codEnabled),
    codMinOrderMinor: checkout?.codMinOrder?.amountMinor ?? null,
    codMaxOrderMinor: checkout?.codMaxOrder?.amountMinor ?? null,
    codFeeMinor: checkout?.codFee?.amountMinor ?? null,
  }
}

/** Saves the rules. The caller checks who may change them (store owner, docs/screens Payments). */
export async function saveCodRules(req: PayloadRequest, input: CodRulesInput): Promise<CodRules> {
  const settings = await settingsOf(req.payload, input.tenantId, req)
  if (!settings) throw new AppError('NOT_FOUND', 'This store has no settings yet', 404)
  await req.payload.update({
    collection: 'site-settings',
    id: settings.id,
    data: {
      checkout: {
        ...settings.checkout,
        codEnabled: input.codEnabled,
        codMinOrder: money(input.codMinOrderMinor),
        codMaxOrder: money(input.codMaxOrderMinor),
        codFee: money(input.codFeeMinor),
      },
    },
    overrideAccess: true,
    req,
  })
  return {
    codEnabled: input.codEnabled,
    codMinOrderMinor: input.codMinOrderMinor,
    codMaxOrderMinor: input.codMaxOrderMinor,
    codFeeMinor: input.codFeeMinor,
  }
}

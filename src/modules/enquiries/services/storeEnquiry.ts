import type { Payload } from 'payload'
import { z } from 'zod'

import { isFeatureEnabled } from '@/modules/tenancy'

import { ENQUIRY_TYPES } from '../constants'

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined)

/** What the store's quote and contact forms send (docs/screens Enquiries, storefront forms). */
export const storeEnquirySchema = z
  .object({
    type: z.enum(ENQUIRY_TYPES.map((t) => t.value) as [string, ...string[]]).default('general'),
    name: z.string().trim().min(2, 'Enter your name').max(120),
    phone: z
      .string()
      .trim()
      .regex(/^[+0-9 ()-]{10,20}$/, 'Enter a 10-digit mobile number')
      .optional()
      .or(z.literal('').transform(() => undefined)),
    email: z
      .email('Enter a valid email')
      .optional()
      .or(z.literal('').transform(() => undefined)),
    city: optional(80),
    pincode: z
      .string()
      .trim()
      .regex(/^[1-9][0-9]{5}$/, 'A pincode has 6 digits')
      .optional()
      .or(z.literal('').transform(() => undefined)),
    company: optional(120),
    qty: z.coerce
      .number()
      .int()
      .min(1)
      .max(100_000)
      .optional()
      .or(z.literal('').transform(() => undefined)),
    message: optional(2000),
    productTitle: optional(200),
    modelNumber: optional(80),
    page: optional(500),
    consent: z.literal(true, { error: 'Tick the box so the store may contact you' }),
  })
  .refine((input) => input.phone || input.email, {
    message: 'Add a mobile number or an email so the store can reply',
    path: ['phone'],
  })

export type StoreEnquiryInput = z.input<typeof storeEnquirySchema>

/**
 * Saves an enquiry from a shopper on the store's own site. The store comes from the request
 * host (never from the form), and the enquiries feature must be on (docs/08).
 */
export async function createStoreEnquiry(
  payload: Payload,
  tenantId: string,
  input: z.output<typeof storeEnquirySchema>,
): Promise<{ referenceNumber: string } | { disabled: true }> {
  if (!(await isFeatureEnabled(payload, tenantId, 'enquiries'))) return { disabled: true }
  const enquiry = await payload.create({
    collection: 'enquiries',
    data: {
      tenant: tenantId,
      type: input.type as 'general',
      status: 'new',
      name: input.name,
      phone: input.phone,
      email: input.email,
      city: input.city,
      pincode: input.pincode,
      company: input.company,
      qty: input.qty,
      message: input.message,
      productTitle: input.productTitle,
      modelNumber: input.modelNumber,
      consentToContact: true,
      source: { page: input.page },
    },
    overrideAccess: true,
  })
  return { referenceNumber: enquiry.referenceNumber ?? '' }
}

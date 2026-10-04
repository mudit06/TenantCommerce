import { z } from 'zod'

import { DEFAULT_TIMEZONE } from '@/lib/dates'
import { parseGstin } from '@/lib/gst/gstin'

import {
  BILLING_CYCLES,
  INDUSTRIES,
  PAYMENT_METHODS,
  RESERVED_SLUGS,
  TENANT_STATUSES,
} from './constants'

// Input schemas shared by the endpoints, scripts and the admin forms (docs/16: validate at the
// edge with zod). No server-only imports here: browser components use these too.

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined))

const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()-]{7,20}$/, 'Enter a phone number, for example +91 90000 00000')

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Use 3 to 40 characters')
  .max(40, 'Use 3 to 40 characters')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase letters, numbers and single hyphens only')
  .refine((value) => !RESERVED_SLUGS.has(value), 'This name is reserved')

export const onboardingSchema = z.object({
  business: z.object({
    name: z.string().trim().min(2, 'Enter the store name').max(80),
    legalName: z.string().trim().min(2, 'Enter the legal name').max(160),
    gstin: z
      .string()
      .trim()
      .toUpperCase()
      .superRefine((value, ctx) => {
        const check = parseGstin(value)
        if (!check.valid) ctx.addIssue({ code: 'custom', message: check.reason })
      }),
    registeredAddress: z
      .object({
        line1: optionalText(160),
        line2: optionalText(160),
        city: optionalText(80),
        pincode: z
          .string()
          .trim()
          .regex(/^[1-9][0-9]{5}$/, 'A pincode has 6 digits')
          .optional()
          .or(z.literal('').transform(() => undefined)),
      })
      .optional(),
    industry: z
      .array(z.enum(INDUSTRIES.map((industry) => industry.value) as [string, ...string[]]))
      .min(1, 'Pick at least one industry'),
    supportEmail: z
      .email('Enter a valid email')
      .optional()
      .or(z.literal('').transform(() => undefined)),
    supportPhone: phone.optional().or(z.literal('').transform(() => undefined)),
  }),
  store: z.object({
    slug: slugSchema,
    defaultLocale: z.literal('en').default('en'),
    timezone: z.literal(DEFAULT_TIMEZONE).default(DEFAULT_TIMEZONE),
  }),
  plan: z.object({
    planId: z.string().min(1, 'Pick a plan'),
    trialDays: z.number().int().min(0).max(90).default(14),
    billingCycle: z.enum(BILLING_CYCLES).default('monthly'),
  }),
  /** Toggles from the "Starting features" step; the plan and the phase still cap them. */
  features: z.record(z.string(), z.boolean()).optional(),
  owner: z.object({
    name: z.string().trim().min(1, 'Enter the owner’s name').max(120),
    email: z.email('Enter a valid email').transform((value) => value.trim().toLowerCase()),
    phone: phone.optional().or(z.literal('').transform(() => undefined)),
    sendInvite: z.boolean().default(true),
  }),
})

export type OnboardingInput = z.input<typeof onboardingSchema>
export type OnboardingData = z.output<typeof onboardingSchema>

export const statusChangeSchema = z.object({
  reason: z.string().trim().max(500).optional(),
})

export const tenantStatusSchema = z.enum(TENANT_STATUSES)

export const featureSwitchSchema = z.object({
  key: z.string().min(1),
  enabled: z.boolean(),
  cascade: z.boolean().optional(),
})

export const recordPaymentSchema = z.object({
  amountMinor: z.number().int().positive('Amount must be more than zero'),
  paidOn: z.coerce.date(),
  method: z.enum(PAYMENT_METHODS.map((method) => method.value) as [string, ...string[]]),
  reference: optionalText(80),
})

export const changePlanSchema = z.object({
  planId: z.string().min(1),
  billingCycle: z.enum(BILLING_CYCLES).optional(),
})

export const subscriptionActionSchema = z.object({
  action: z.enum(['pause', 'resume', 'cancel']),
  reason: optionalText(500),
})

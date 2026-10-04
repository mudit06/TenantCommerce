import type { PayloadRequest } from 'payload'

import { isSuperAdmin } from '@/access'
import { env } from '@/lib/env'
import { emit } from '@/lib/events'
import { AppError } from '@/lib/errors'
import { recordAudit } from '@/modules/audit'
import type { FeatureKey } from '@/modules/features'
import { inviteStaff } from '@/modules/identity'
import type { Tenant } from '@/payload-types'

import type { Industry } from '../constants'
import { onboardingSchema, type OnboardingInput } from '../schemas'
import { seedTenantFeatures } from './features'
import { startSubscription } from './subscriptions'

export type OnboardingResult = {
  tenant: Tenant
  subscriptionId: string
  primaryHost: string
  ownerUserId: string
  /** Set-password link for the owner. Scripts print it; endpoints never return it. */
  ownerInviteUrl: string
  inviteEmailed: boolean
  featuresOn: FeatureKey[]
}

export const subdomainFor = (slug: string) => `${slug}.${env.PLATFORM_DOMAIN}`

/**
 * Onboards a vendor (docs/04 "Create"): a draft store, its subdomain, a subscription (with a
 * trial), feature switches from the industry preset capped by the plan, and the owner's invite.
 * Other modules seed their own defaults (store settings, counters, tax rates, menus) on
 * `tenant.created`. Run it inside `withTransaction` so a failure leaves nothing behind.
 */
export async function createTenant(
  req: PayloadRequest,
  rawInput: OnboardingInput,
): Promise<OnboardingResult> {
  if (req.user && !isSuperAdmin(req.user)) {
    throw new AppError('FORBIDDEN', 'Only super admins onboard vendors', 403)
  }
  const input = onboardingSchema.parse(rawInput)
  const { payload } = req
  const host = subdomainFor(input.store.slug)

  // One at a time: commands inside a Mongo transaction must not run in parallel
  const slugTaken = await payload.count({
    collection: 'tenants',
    where: { slug: { equals: input.store.slug } },
    overrideAccess: true,
    req,
  })
  const hostTaken = await payload.count({
    collection: 'tenant-domains',
    where: { host: { equals: host } },
    overrideAccess: true,
    req,
  })
  if (slugTaken.totalDocs > 0 || hostTaken.totalDocs > 0) {
    throw new AppError('CONFLICT', `The slug "${input.store.slug}" is already taken`, 409, {
      'store.slug': 'Already taken',
    })
  }

  const plan = await payload
    .findByID({ collection: 'plans', id: input.plan.planId, depth: 0, overrideAccess: true, req })
    .catch(() => null)
  if (!plan || !plan.isActive) {
    throw new AppError('VALIDATION_FAILED', 'Pick an active plan', 400, {
      'plan.planId': 'Pick an active plan',
    })
  }

  const tenant = await payload.create({
    collection: 'tenants',
    data: {
      name: input.business.name,
      legalName: input.business.legalName,
      gstin: input.business.gstin,
      registeredAddress: input.business.registeredAddress,
      industry: input.business.industry as Industry[],
      supportEmail: input.business.supportEmail,
      supportPhone: input.business.supportPhone,
      slug: input.store.slug,
      defaultLocale: input.store.defaultLocale,
      enabledLocales: [input.store.defaultLocale],
      timezone: input.store.timezone,
      currency: 'INR',
      status: 'draft',
      plan: plan.id,
      createdBy: req.user?.collection === 'users' ? req.user.id : undefined,
      presetAppliedAt: new Date().toISOString(),
    },
    overrideAccess: true,
    req,
  })
  const tenantId = String(tenant.id)

  await payload.create({
    collection: 'tenant-domains',
    data: {
      host,
      tenant: tenant.id,
      type: 'subdomain',
      isPrimary: true,
      redirectToPrimary: true,
      verifiedAt: new Date().toISOString(),
      // Covered by the platform's wildcard certificate
      sslStatus: 'active',
    },
    overrideAccess: true,
    req,
    context: { skipAudit: true },
  })

  const subscription = await startSubscription(req, {
    tenantId,
    vendorName: tenant.name,
    planId: String(plan.id),
    trialDays: input.plan.trialDays,
    billingCycle: input.plan.billingCycle,
  })

  const switches = await seedTenantFeatures(req, {
    tenantId,
    industries: input.business.industry as Industry[],
    allowedModules: (plan.allowedModules ?? []) as string[],
    overrides: input.features as Partial<Record<FeatureKey, boolean>> | undefined,
  })
  const featuresOn = (Object.entries(switches) as [FeatureKey, boolean][])
    .filter(([, on]) => on)
    .map(([key]) => key)

  await emit('tenant.created', { tenantId }, { req })
  await recordAudit(req, {
    action: 'store_created',
    tenant: tenantId,
    collectionSlug: 'tenants',
    docId: tenantId,
    summary: `Store created with the ${input.business.industry.join(' + ')} preset, ${plan.name} plan`,
  })

  // Last, so nothing after the email can roll the store back
  const invite = await inviteStaff(
    req,
    { email: input.owner.email, name: input.owner.name, tenantId, roles: ['owner'] },
    { sendEmail: input.owner.sendInvite },
  )
  if (input.owner.phone) {
    await payload.update({
      collection: 'users',
      id: invite.userId,
      data: { phone: input.owner.phone },
      overrideAccess: true,
      req,
      context: { skipAudit: true },
    })
  }

  return {
    tenant,
    subscriptionId: String(subscription.id),
    primaryHost: host,
    ownerUserId: invite.userId,
    ownerInviteUrl: invite.inviteUrl,
    inviteEmailed: invite.emailed,
    featuresOn,
  }
}

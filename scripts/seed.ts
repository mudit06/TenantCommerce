/**
 * pnpm seed: interim plans, the first super admin and two demo stores, then each store's default
 * settings, menus and draft pages. Safe to run again: existing records (matched by plan code,
 * email or slug) are left alone and only missing defaults are added.
 */
import config from '@payload-config'
import { createLocalReq, getPayload } from 'payload'

import { withTransaction } from '@/lib/db/transaction'
import { ensureStoreDefaults } from '@/modules/content'
import { changeTenantStatus, createTenant, syncEnabledFeatures } from '@/modules/tenancy'

import { DEMO_TENANTS, PLANS } from './seedData'

const payload = await getPayload({ config })

try {
  const planIds = new Map<string, string>()
  for (const plan of PLANS) {
    const { docs } = await payload.find({
      collection: 'plans',
      where: { code: { equals: plan.code } },
      limit: 1,
    })
    const existing = docs[0]
    const doc =
      existing ?? (await payload.create({ collection: 'plans', data: { ...plan, isActive: true } }))
    planIds.set(plan.code, String(doc.id))
    console.log(`${existing ? '·' : '+'} plan ${plan.name}`)
  }

  const email = process.env.SEED_SUPER_ADMIN_EMAIL
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD
  if (!email || !password)
    throw new Error('Set SEED_SUPER_ADMIN_EMAIL and SEED_SUPER_ADMIN_PASSWORD in .env')
  const { docs: admins } = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
  })
  const admin =
    admins[0] ??
    (await payload.create({
      collection: 'users',
      data: {
        email,
        password,
        name: 'Platform Admin',
        platformRole: 'super-admin',
        status: 'active',
      },
      overrideAccess: true,
    }))
  console.log(`${admins[0] ? '·' : '+'} super admin ${email}`)

  // Act as the super admin so onboarding records who created the stores
  const req = await createLocalReq({ user: { ...admin, collection: 'users' } }, payload)
  for (const demo of DEMO_TENANTS) {
    const exists = await payload.count({
      collection: 'tenants',
      where: { slug: { equals: demo.store.slug } },
    })
    if (exists.totalDocs > 0) {
      console.log(`· store ${demo.store.slug}`)
      continue
    }
    const planId = planIds.get(demo.planCode)
    if (!planId) throw new Error(`Unknown plan ${demo.planCode}`)
    const result = await withTransaction(req, () =>
      createTenant(req, {
        business: demo.business,
        store: demo.store,
        owner: demo.owner,
        plan: { planId, trialDays: demo.trialDays, billingCycle: 'monthly' },
      }),
    )
    await withTransaction(req, () =>
      changeTenantStatus(req, { tenantId: String(result.tenant.id), to: 'active' }),
    )
    console.log(
      `+ store ${demo.store.slug} (${result.primaryHost}), ${result.featuresOn.length} features on`,
    )
    console.log(`    owner ${demo.owner.email} sets a password at ${result.ownerInviteUrl}`)
  }
  // Backfill per-store data added after older stores were created (both steps are idempotent)
  const { docs: stores } = await payload.find({
    collection: 'tenants',
    depth: 0,
    pagination: false,
    select: { slug: true },
  })
  for (const store of stores) {
    await withTransaction(req, async () => {
      await syncEnabledFeatures(req, String(store.id))
      await ensureStoreDefaults(req, String(store.id))
    })
  }
  console.log(`· store settings, menus and draft pages checked for ${stores.length} stores`)
  console.log('Seed complete.')
  process.exit(0)
} catch (error) {
  console.error(error)
  process.exit(1)
}

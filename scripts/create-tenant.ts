/**
 * pnpm create-tenant <input.json>
 * Onboards one vendor with the same steps as the super admin "New vendor" screen (docs/04).
 * The JSON matches onboardingSchema in src/modules/tenancy/schemas.ts; see
 * tests/fixtures/new-tenant.example.json.
 */
import { readFile } from 'node:fs/promises'

import config from '@payload-config'
import { createLocalReq, getPayload } from 'payload'

import { withTransaction } from '@/lib/db/transaction'
import { createTenant, onboardingSchema } from '@/modules/tenancy'

const file = process.argv.slice(2).find((arg) => arg.endsWith('.json'))
if (!file) {
  console.error('Usage: pnpm create-tenant path/to/tenant.json')
  process.exit(1)
}

const payload = await getPayload({ config })
try {
  const input = onboardingSchema.parse(JSON.parse(await readFile(file, 'utf8')))
  const req = await createLocalReq({}, payload)
  const result = await withTransaction(req, () => createTenant(req, input))
  console.log(`Created draft store ${result.tenant.name} at ${result.primaryHost}`)
  console.log(`Features on: ${result.featuresOn.join(', ')}`)
  console.log(
    result.inviteEmailed
      ? `Invite emailed to ${input.owner.email}`
      : `Owner sets a password at ${result.ownerInviteUrl}`,
  )
  console.log(
    `Next: create src/storefront/vendors/${result.tenant.slug}/ (docs/10 new vendor checklist)`,
  )
  process.exit(0)
} catch (error) {
  console.error(error)
  process.exit(1)
}

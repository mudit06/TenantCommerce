/**
 * pnpm reset-two-step <email>
 * Turns off someone's two-step sign-in from the server, like a super admin's "Reset two-step"
 * (docs/05), for when no super admin can sign in. Audited. They set it up again at next sign-in.
 */
import config from '@payload-config'
import { createLocalReq, getPayload } from 'payload'

import { withTransaction } from '@/lib/db/transaction'
import { resetTwoStepFromServer } from '@/modules/identity'

const email = process.argv.slice(2).find((arg) => arg.includes('@'))
if (!email) {
  console.error('Usage: pnpm reset-two-step person@example.com')
  process.exit(1)
}

const payload = await getPayload({ config })
try {
  const req = await createLocalReq({}, payload)
  const target = await withTransaction(req, () => resetTwoStepFromServer(req, email))
  console.log(`Two-step sign-in reset for ${target.name} (${target.email}).`)
  console.log('Sign in with the password, then scan the new QR code on every phone you want.')
  process.exit(0)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}

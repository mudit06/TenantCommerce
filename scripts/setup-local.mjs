/**
 * pnpm setup:local
 * Creates .env from .env.example for local development and fills in the values that must be
 * secret: PAYLOAD_SECRET, CONNECTOR_ENC_KEY and the first super admin's password. Never overwrites an existing .env;
 * run again to see what is still missing.
 */
import { randomBytes } from 'node:crypto'
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'

const ENV = '.env'
const EXAMPLE = '.env.example'

const read = (file) => readFileSync(file, 'utf8')
const valueOf = (text, key) => text.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? ''
const setValue = (text, key, value) =>
  text.replace(new RegExp(`^${key}=.*$`, 'm'), `${key}=${value}`)

let created = false
if (!existsSync(ENV)) {
  copyFileSync(EXAMPLE, ENV)
  created = true
}

let text = read(ENV)
const filled = []
if (!valueOf(text, 'PAYLOAD_SECRET')) {
  text = setValue(text, 'PAYLOAD_SECRET', randomBytes(32).toString('hex'))
  filled.push('PAYLOAD_SECRET')
}
if (!valueOf(text, 'CONNECTOR_ENC_KEY')) {
  // A .env made before connectors existed has no line for it yet
  const key = randomBytes(32).toString('base64')
  text = /^CONNECTOR_ENC_KEY=/m.test(text)
    ? setValue(text, 'CONNECTOR_ENC_KEY', key)
    : `${text.trimEnd()}\n\n# Encrypts connector secrets (docs/14). Never change it once keys are saved.\nCONNECTOR_ENC_KEY=${key}\n`
  filled.push('CONNECTOR_ENC_KEY')
}
if (!valueOf(text, 'SEED_SUPER_ADMIN_PASSWORD')) {
  // Readable but strong: 4 groups of 4, well over the 10-character minimum
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(16)
  const raw = Array.from(bytes, (b) => chars[b % chars.length]).join('')
  text = setValue(text, 'SEED_SUPER_ADMIN_PASSWORD', raw.match(/.{4}/g).join('-'))
  filled.push('SEED_SUPER_ADMIN_PASSWORD')
}
writeFileSync(ENV, text)

const missing = [
  'DATABASE_URI',
  'PAYLOAD_SECRET',
  'ADMIN_URL',
  'SEED_SUPER_ADMIN_EMAIL',
  'SEED_SUPER_ADMIN_PASSWORD',
].filter((key) => !valueOf(text, key))

console.log(created ? 'Created .env from .env.example' : '.env already exists, kept your values')
if (filled.length) console.log(`Generated: ${filled.join(', ')}`)
if (missing.length) {
  console.log(`Still empty in .env: ${missing.join(', ')}`)
  process.exitCode = 1
} else {
  console.log('')
  console.log('First sign-in (after `pnpm seed`):')
  console.log(`  ${valueOf(text, 'ADMIN_URL')}/admin`)
  console.log(`  email     ${valueOf(text, 'SEED_SUPER_ADMIN_EMAIL')}`)
  console.log(`  password  ${valueOf(text, 'SEED_SUPER_ADMIN_PASSWORD')}   (also in .env)`)
}

import { readFileSync, writeFileSync } from 'node:fs'

const ENV_PATH = '.env'
const FROM = 'media.tenantecom.in'
const TO = 'pub-d3b58ef373f34646a575793c6b2852db.r2.dev'

const original = readFileSync(ENV_PATH, 'utf8')
const updated = original.split(FROM).join(TO)
writeFileSync(ENV_PATH, updated)

const lines = readFileSync(ENV_PATH, 'utf8')
  .split(/\r?\n/)
  .filter((l) => l.startsWith('CLOUDFLARE_R2_PUBLIC_DOMAIN') || l.startsWith('MEDIA_PUBLIC_URL'))

console.log('--- Updated .env lines ---')
console.log(lines.join('\n'))
console.log('--- Done ---')

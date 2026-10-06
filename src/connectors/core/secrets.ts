import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto'

import { env } from '@/lib/env'

// Connector secrets at rest (docs/09 `secretConfig`, docs/14): AES-256-GCM with the key in
// CONNECTOR_ENC_KEY. Stored as `v1.<iv>.<tag>.<ciphertext>` (base64url), so a later key or
// algorithm can be told apart by its version. Decrypted only on the server, inside a connector
// call; never returned to the browser, logged or written to the audit log.

const VERSION = 'v1'
const IV_BYTES = 12

function encryptionKey(): Buffer {
  if (env.CONNECTOR_ENC_KEY) return Buffer.from(env.CONNECTOR_ENC_KEY, 'base64')
  if (env.NODE_ENV === 'production') {
    throw new Error('CONNECTOR_ENC_KEY is required in production (docs/14)')
  }
  // Local and test databases only: derived from PAYLOAD_SECRET so a fresh checkout works
  return Buffer.from(hkdfSync('sha256', env.PAYLOAD_SECRET, 'tenantecom', 'connector-secrets', 32))
}

export function encryptSecret(plain: Record<string, string>): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const body = Buffer.concat([cipher.update(JSON.stringify(plain), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [VERSION, iv, tag, body]
    .map((part) => (typeof part === 'string' ? part : part.toString('base64url')))
    .join('.')
}

/** The saved secrets, or an empty object when none are saved. Throws when the data was altered. */
export function decryptSecret(sealed: string | null | undefined): Record<string, string> {
  if (!sealed) return {}
  const [version, iv, tag, body] = sealed.split('.')
  if (version !== VERSION || !iv || !tag || body === undefined) {
    throw new Error('Unreadable connector secret')
  }
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64url'))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  const plain = Buffer.concat([
    decipher.update(Buffer.from(body, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
  const parsed = JSON.parse(plain) as unknown
  if (!parsed || typeof parsed !== 'object') return {}
  return Object.fromEntries(
    Object.entries(parsed).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  )
}

/** "rzp_live_••••••a91F": enough to recognise a key, never enough to use it. */
export function maskValue(value: string | null | undefined, visible = 4): string {
  if (!value) return ''
  if (value.length <= visible + 2) return '•'.repeat(value.length)
  const underscore = value.lastIndexOf('_')
  const head =
    underscore > 0 && underscore < value.length - visible ? value.slice(0, underscore + 1) : ''
  return `${head}••••••${value.slice(-visible)}`
}

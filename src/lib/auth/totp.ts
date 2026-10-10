import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

// Time-based one-time codes for staff two-step sign-in (RFC 6238, docs/05): SHA-1, 6 digits,
// 30-second steps, which every authenticator app (Google, Microsoft, Authy, 1Password) reads.

const STEP_SECONDS = 30
const DIGITS = 6
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Encode(bytes: Buffer): string {
  let bits = 0
  let value = 0
  let out = ''
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31]
  return out
}

export function base32Decode(text: string): Buffer {
  const clean = text.replace(/[\s=-]/g, '').toUpperCase()
  let bits = 0
  let value = 0
  const out: number[] = []
  for (const char of clean) {
    const index = BASE32.indexOf(char)
    if (index === -1) throw new Error('Not a base32 secret')
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(out)
}

/** A new 160-bit secret, base32 as authenticator apps expect it. */
export const newTotpSecret = (): string => base32Encode(randomBytes(20))

/** The code for one 30-second step (RFC 4226 HOTP over the step counter). */
export function totpCode(secret: string, step: number): string {
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(step))
  const hmac = createHmac('sha1', base32Decode(secret)).update(counter).digest()
  const offset = hmac[hmac.length - 1]! & 0x0f
  const binary =
    ((hmac[offset]! & 0x7f) << 24) |
    (hmac[offset + 1]! << 16) |
    (hmac[offset + 2]! << 8) |
    hmac[offset + 3]!
  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0')
}

export const totpStep = (at = Date.now()) => Math.floor(at / 1000 / STEP_SECONDS)

/**
 * Checks a typed code against the current step and one either side (phones drift a little).
 * Returns the step that matched, so the caller can refuse the same code twice, or null.
 */
export function verifyTotp(secret: string, code: string, at = Date.now()): number | null {
  const typed = code.replace(/\s/g, '')
  if (!/^\d{6}$/.test(typed)) return null
  const now = totpStep(at)
  for (const step of [now, now - 1, now + 1]) {
    const expected = Buffer.from(totpCode(secret, step))
    if (timingSafeEqual(expected, Buffer.from(typed))) return step
  }
  return null
}

/** The address authenticator apps read from the QR code. */
export function otpauthUrl(secret: string, account: string, issuer: string): string {
  const label = encodeURIComponent(`${issuer}:${account}`)
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  })
  return `otpauth://totp/${label}?${params}`
}

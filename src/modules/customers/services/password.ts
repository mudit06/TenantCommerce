import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

// Shopper passwords (ADR 0003): scrypt from Node, with a random salt per password. Stored as
// `scrypt$N$r$p$salt$hash` so the cost can be raised later without breaking old hashes.

const N = 16384
const R = 8
const P = 1
const KEY_LENGTH = 64

const derive = (password: string, salt: Buffer, n: number, r: number, p: number) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, KEY_LENGTH, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  )

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await derive(password, salt, N, R, P)
  return ['scrypt', N, R, P, salt.toString('base64url'), key.toString('base64url')].join('$')
}

/** A fixed hash checked when there is no account, so both answers take as long */
const DUMMY = `scrypt$${N}$${R}$${P}$${'A'.repeat(22)}$${'A'.repeat(86)}`

export async function verifyPassword(password: string, stored: string | null | undefined) {
  const [scheme, n, r, p, salt, hash] = (stored || DUMMY).split('$')
  if (scheme !== 'scrypt' || !salt || !hash) return false
  const expected = Buffer.from(hash, 'base64url')
  const key = await derive(
    password,
    Buffer.from(salt, 'base64url'),
    Number(n),
    Number(r),
    Number(p),
  )
  return Boolean(stored) && key.length === expected.length && timingSafeEqual(key, expected)
}

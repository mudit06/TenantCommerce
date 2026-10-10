import { describe, expect, it } from 'vitest'

import {
  base32Decode,
  base32Encode,
  newTotpSecret,
  otpauthUrl,
  totpCode,
  totpStep,
  verifyTotp,
} from '@/lib/auth/totp'

// RFC 6238 appendix B, SHA-1: the ASCII secret "12345678901234567890". The RFC's codes have 8
// digits; authenticator apps show the last 6.
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'))

describe('TOTP (staff two-step sign-in)', () => {
  it('round-trips base32', () => {
    expect(RFC_SECRET).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ')
    expect(base32Decode(RFC_SECRET).toString()).toBe('12345678901234567890')
    expect(base32Decode('gezd gnbv-gy3t qojq gezd gnbv gy3t qojq').toString()).toBe(
      '12345678901234567890',
    )
  })

  it.each([
    [59, '287082'],
    [1111111109, '081804'],
    [1111111111, '050471'],
    [1234567890, '005924'],
    [2000000000, '279037'],
  ])('matches the RFC 6238 vector at %i s', (seconds, code) => {
    expect(totpCode(RFC_SECRET, totpStep(seconds * 1000))).toBe(code)
  })

  it('accepts the current code and one step either side, nothing further', () => {
    const at = 1_800_000_000_000
    const step = totpStep(at)
    expect(verifyTotp(RFC_SECRET, totpCode(RFC_SECRET, step), at)).toBe(step)
    expect(verifyTotp(RFC_SECRET, totpCode(RFC_SECRET, step - 1), at)).toBe(step - 1)
    expect(verifyTotp(RFC_SECRET, totpCode(RFC_SECRET, step + 1), at)).toBe(step + 1)
    expect(verifyTotp(RFC_SECRET, totpCode(RFC_SECRET, step - 3), at)).toBeNull()
  })

  it('refuses anything that is not six digits', () => {
    expect(verifyTotp(RFC_SECRET, '12345')).toBeNull()
    expect(verifyTotp(RFC_SECRET, 'abcdef')).toBeNull()
    expect(verifyTotp(RFC_SECRET, '')).toBeNull()
  })

  it('makes 160-bit secrets and an address authenticator apps read', () => {
    const secret = newTotpSecret()
    expect(base32Decode(secret)).toHaveLength(20)
    expect(newTotpSecret()).not.toBe(secret)
    const address = otpauthUrl(secret, 'rohit@tenantecom.in', 'TenantEcom')
    expect(address.startsWith('otpauth://totp/TenantEcom%3Arohit%40tenantecom.in?')).toBe(true)
    const url = new URL(address)
    expect(url.searchParams.get('secret')).toBe(secret)
    expect(url.searchParams.get('digits')).toBe('6')
  })
})

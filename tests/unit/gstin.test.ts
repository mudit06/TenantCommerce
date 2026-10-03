import { describe, expect, it } from 'vitest'

import { gstinCheckCharacter, isValidPan, parseGstin } from '@/lib/gst/gstin'

describe('GSTIN', () => {
  it('accepts a real, published GSTIN and derives PAN and state', () => {
    const check = parseGstin('27aapfu0939f1zv')
    expect(check).toMatchObject({
      valid: true,
      gstin: '27AAPFU0939F1ZV',
      pan: 'AAPFU0939F',
      stateCode: '27',
      stateName: 'Maharashtra',
    })
  })

  it('catches a typo through the check character', () => {
    const check = parseGstin('27AAPFU0939F1ZW')
    expect(check.valid).toBe(false)
  })

  it('rejects unknown state codes and bad shapes', () => {
    const body = '99AAPFU0939F1Z'
    expect(parseGstin(body + gstinCheckCharacter(body)).valid).toBe(false)
    expect(parseGstin('ABC').valid).toBe(false)
  })

  it('validates PAN format', () => {
    expect(isValidPan('AAKCB1234F')).toBe(true)
    expect(isValidPan('AAKCB12345')).toBe(false)
  })
})

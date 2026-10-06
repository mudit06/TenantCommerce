import { describe, expect, it } from 'vitest'

import { numberInWords, rupeesInWords } from '@/lib/money/words'

describe('amounts in words', () => {
  it('reads Indian grouping', () => {
    expect(numberInWords(0)).toBe('Zero')
    expect(numberInWords(15)).toBe('Fifteen')
    expect(numberInWords(105)).toBe('One Hundred Five')
    expect(numberInWords(23_640)).toBe('Twenty Three Thousand Six Hundred Forty')
    expect(numberInWords(1_00_000)).toBe('One Lakh')
    expect(numberInWords(12_34_567)).toBe(
      'Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven',
    )
    expect(numberInWords(1_23_45_678)).toBe(
      'One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight',
    )
    expect(numberInWords(105_00_00_000)).toBe('One Hundred Five Crore')
  })
  it('writes rupees and paise for invoices', () => {
    expect(rupeesInWords(23_64_000)).toBe('Rupees Twenty Three Thousand Six Hundred Forty Only')
    expect(rupeesInWords(2_09_850)).toBe('Rupees Two Thousand Ninety Eight and Fifty Paise Only')
    expect(rupeesInWords(1)).toBe('Rupees Zero and One Paise Only')
  })
  it('refuses fractions', () => {
    expect(() => rupeesInWords(10.5)).toThrow()
  })
})

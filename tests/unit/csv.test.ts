import { describe, expect, it } from 'vitest'

import { csvCell, csvFile, parseCsv } from '@/lib/csv'

describe('CSV', () => {
  it('reads quoted cells with commas, quotes and line breaks, and drops blank lines', () => {
    const text = '﻿sku,title,note\r\nAV-1,"Aria, chrome","Say ""hi""\nthere"\r\n\r\nAV-2,Nimbus,\n'
    expect(parseCsv(text)).toEqual([
      ['sku', 'title', 'note'],
      ['AV-1', 'Aria, chrome', 'Say "hi"\nthere'],
      ['AV-2', 'Nimbus', ''],
    ])
  })

  it('writes what it reads, and never a formula', () => {
    const rows = [
      ['a', 'b,c', 'd"e'],
      ['=SUM(A1)', '', '1'],
    ]
    expect(parseCsv(csvFile(rows))).toEqual([
      ['a', 'b,c', 'd"e'],
      ["'=SUM(A1)", '', '1'],
    ])
    expect(csvCell('+91 98765')).toBe("'+91 98765")
  })
})

describe('import cells', () => {
  it('reads rupees as typed in spreadsheets, into paise', async () => {
    const { rupeesToPaise, yesNo } = await import('@/modules/imports/services/cells')
    expect(rupeesToPaise('4250')).toBe(4_25_000)
    expect(rupeesToPaise('4250.5')).toBe(4_25_050)
    expect(rupeesToPaise('₹1,12,400.00')).toBe(1_12_40_000)
    expect(rupeesToPaise('')).toBeNull()
    expect(rupeesToPaise('4,250/-')).toBeUndefined()
    expect(rupeesToPaise('12.345')).toBeUndefined()
    expect([yesNo('Yes'), yesNo('0'), yesNo(''), yesNo('maybe')]).toEqual([
      true,
      false,
      null,
      undefined,
    ])
  })
})

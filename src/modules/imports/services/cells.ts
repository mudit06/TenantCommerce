// Reading cells as typed in spreadsheets (pure): rupees, numbers, yes/no, and the row errors.

export type RowError = { row: number; column: string; message: string; value: string }

/** A file row: its number in the spreadsheet (header is row 1) and cells by column name */
export type Row = { line: number; cells: Record<string, string> }

export function toRows(table: string[][]): { header: string[]; rows: Row[] } {
  const [head = [], ...body] = table
  const header = head.map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'))
  return {
    header,
    rows: body.map((cells, i) => ({
      line: i + 2,
      cells: Object.fromEntries(header.map((h, j) => [h, (cells[j] ?? '').trim()])),
    })),
  }
}

/** "4250", "4250.50", "₹4,250" → paise; null when empty; undefined when not an amount */
export function rupeesToPaise(value: string): number | null | undefined {
  const clean = value.replace(/[₹\s]/g, '').replace(/,(?=\d{2,3}(\D|$))/g, '')
  if (!clean) return null
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return undefined
  const [whole, fraction = ''] = clean.split('.')
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
}

export const PRICE_HELP = 'Price must be a number in rupees, like 4250 or 4250.50.'

export function wholeNumber(value: string): number | null | undefined {
  if (!value) return null
  return /^\d+$/.test(value) ? Number(value) : undefined
}

export function yesNo(value: string): boolean | null | undefined {
  const v = value.toLowerCase()
  if (!v) return null
  if (['yes', 'y', 'true', '1'].includes(v)) return true
  if (['no', 'n', 'false', '0'].includes(v)) return false
  return undefined
}

/** Case- and space-insensitive comparison of names */
export const same = (a: string | null | undefined, b: string | null | undefined) =>
  (a ?? '').trim().toLowerCase().replace(/\s+/g, ' ') ===
  (b ?? '').trim().toLowerCase().replace(/\s+/g, ' ')

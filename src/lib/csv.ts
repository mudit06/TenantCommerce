// CSV files for spreadsheets (exports): one cell made safe, and the whole file with a byte-order
// mark so Excel reads ₹ and Indian names correctly.

export const csvCell = (value: unknown) => {
  const text = value === null || value === undefined ? '' : String(value)
  // A leading = + - @ would run as a formula in Excel (CSV injection)
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export const csvFile = (rows: unknown[][]) =>
  `﻿${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`

export const csvResponse = (rows: unknown[][], filename: string) =>
  new Response(csvFile(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  })

/**
 * Reads a CSV file into rows of cells (RFC 4180: quoted cells may hold commas, quotes as "" and
 * line breaks). Strips Excel's byte-order mark; blank lines are dropped.
 */
export function parseCsv(text: string): string[][] {
  const input = text.replace(/^﻿/, '')
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i]!
    if (quoted) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          cell += '"'
          i += 1
        } else quoted = false
      } else cell += ch
    } else if (ch === '"' && cell === '') quoted = true
    else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && input[i + 1] === '\n') i += 1
      row.push(cell)
      if (row.some((c) => c.trim() !== '')) rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  row.push(cell)
  if (row.some((c) => c.trim() !== '')) rows.push(row)
  return rows
}

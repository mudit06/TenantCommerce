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

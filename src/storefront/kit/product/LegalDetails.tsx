import type { Product } from '@/payload-types'

const country = (code?: string | null) => {
  if (!code) return null
  try {
    return new Intl.DisplayNames(['en-IN'], { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}

const MADE_BY = {
  manufacturer: 'Manufactured by',
  packer: 'Packed by',
  importer: 'Imported by',
} as const

/** Legal Metrology declarations every product page shows (docs/06 `legal`, docs/10 UX rules). */
export function LegalDetails({ legal }: { legal: Product['legal'] }) {
  if (!legal) return null
  const rows = [
    ['Generic name', legal.genericName],
    ['Net quantity', legal.netQuantity],
    ['Country of origin', country(legal.countryOfOrigin)],
    [
      MADE_BY[legal.madeBy ?? 'manufacturer'],
      [legal.madeByName, legal.madeByAddress].filter(Boolean).join(', '),
    ],
    ['Consumer care', legal.consumerCare],
  ].filter((row): row is [string, string] => Boolean(row[1]))
  if (rows.length === 0) return null
  return (
    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
      {rows.map(([label, value]) => (
        <div className="contents" key={label}>
          <dt className="text-ink-soft">{label}</dt>
          <dd className="text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

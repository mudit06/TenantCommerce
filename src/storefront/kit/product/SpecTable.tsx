import type { Attribute } from '@/modules/catalog'

type Row = { label: string; value: string }

const display = (attribute: Attribute, value: unknown): string | null => {
  const labelOf = (v: string) => attribute.options?.find((option) => option.value === v)?.label ?? v
  if (value === undefined || value === null || value === '') return null
  if (Array.isArray(value))
    return value.length ? value.map((v) => labelOf(String(v))).join(', ') : null
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  const text =
    attribute.type === 'select' || attribute.type === 'color'
      ? labelOf(String(value))
      : String(value)
  return attribute.unit && typeof value === 'number' ? `${text} ${attribute.unit}` : text
}

/** Specifications grouped as in the attribute set (docs/10 kit: SpecTable). */
export function SpecTable({
  attributes,
  values,
  extra = [],
}: {
  attributes: readonly Attribute[]
  values: Record<string, unknown>
  extra?: Row[]
}) {
  const groups = new Map<string, Row[]>()
  for (const attribute of attributes) {
    const text = display(attribute, values[attribute.code ?? ''])
    if (!text) continue
    const group = attribute.isVariantAxis ? 'Available in' : attribute.group || 'Details'
    groups.set(group, [...(groups.get(group) ?? []), { label: attribute.label, value: text }])
  }
  if (extra.length) groups.set('Details', [...(groups.get('Details') ?? []), ...extra])
  if (groups.size === 0) return null
  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([group, rows]) => (
        <div key={group}>
          <h3 className="mb-2 text-sm font-semibold tracking-wide text-ink-soft uppercase">
            {group === 'Options' ? 'Available in' : group}
          </h3>
          <dl className="divide-y divide-line rounded-card border border-line">
            {rows.map((row) => (
              <div
                className="grid grid-cols-[minmax(7rem,40%)_1fr] gap-4 px-4 py-2.5 text-sm"
                key={row.label}
              >
                <dt className="text-ink-soft">{row.label}</dt>
                <dd className="font-medium text-ink">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  )
}

import { formatINR } from '@/lib/money'

/** A GST-inclusive price with the MRP struck through and the saving (docs/screens storefront rules). */
export function Price({
  amountMinor,
  mrpMinor,
  size = 'md',
  showTaxNote = false,
}: {
  amountMinor: number
  mrpMinor?: number | null
  size?: 'sm' | 'md' | 'lg'
  showTaxNote?: boolean
}) {
  const off =
    mrpMinor && mrpMinor > amountMinor ? Math.round(((mrpMinor - amountMinor) / mrpMinor) * 100) : 0
  const main = size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-lg' : 'text-sm'
  return (
    <div>
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className={`${main} font-bold text-ink`}>{formatINR(amountMinor)}</span>
        {off > 0 ? (
          <>
            <span className="text-xs text-ink-soft">
              {size === 'lg' ? 'MRP ' : ''}
              <s>{formatINR(mrpMinor!)}</s>
            </span>
            <span className="text-xs font-semibold text-[#1F7A3E]">{off}% off</span>
          </>
        ) : null}
      </p>
      {showTaxNote ? <p className="mt-0.5 text-xs text-ink-soft">Inclusive of all taxes</p> : null}
    </div>
  )
}

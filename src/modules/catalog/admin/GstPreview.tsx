'use client'

import { useFormFields } from '@payloadcms/ui'

import { splitInclusive } from '@/lib/gst/tax'
import { formatINR } from '@/lib/money'

/**
 * What the selling price works out to (docs/screens `cms-product-edit`, Price and GST): the
 * taxable value and the GST inside it, with the same rounding as checkout. Display only: the
 * server works out every order's tax itself.
 */
export function GstPreview() {
  const price = useFormFields(
    ([fields]) => fields['price.amountMinor']?.value as number | undefined,
  )
  const rate = useFormFields(([fields]) => fields.gstRate?.value as string | undefined)
  const percent = Number(rate)
  if (!price || !Number.isFinite(percent)) {
    return (
      <p className="te-notice te-notice--info te-small">
        Enter the selling price and GST rate to see the taxable value and GST in it.
      </p>
    )
  }
  const { taxableMinor, taxMinor } = splitInclusive(Math.round(price), percent)
  return (
    <p className="te-notice te-notice--info te-small">
      For {formatINR(price, { decimals: 'always' })} the taxable value is{' '}
      {formatINR(taxableMinor, { decimals: 'always' })} and GST is{' '}
      {formatINR(taxMinor, { decimals: 'always' })}. It is split into CGST and SGST, or IGST, at
      checkout from the delivery state.
    </p>
  )
}

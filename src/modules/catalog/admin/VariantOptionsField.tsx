'use client'

import { FieldLabel, useField, useFormFields } from '@payloadcms/ui'
import type { JSONFieldClientComponent } from 'payload'
import { useEffect, useState } from 'react'

import { callApi } from '@/admin/client/api'

import { relationId, type VariantAxis } from './types'

/** One select per product option (finish, size): the values this product is offered in. */
export const VariantOptionsField: JSONFieldClientComponent = ({ path: pathFromProps, field }) => {
  const { value, setValue, path } = useField<Record<string, string> | null>({
    potentiallyStalePath: pathFromProps,
  })
  const productId = useFormFields(([fields]) => relationId(fields.product?.value))
  const [loaded, setLoaded] = useState<{ productId: string; axes: VariantAxis[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!productId) return
    let cancelled = false
    void callApi<{ axes: VariantAxis[] }>(`/admin/v1/catalog/products/${productId}/variant-axes`, {
      method: 'GET',
    }).then((response) => {
      if (cancelled) return
      if (response.ok) {
        setLoaded({ productId, axes: response.data.axes })
        setError(null)
      } else setError(response.error.message)
    })
    return () => {
      cancelled = true
    }
  }, [productId])

  const values = value && typeof value === 'object' ? value : {}
  const axes = loaded && loaded.productId === productId ? loaded.axes : null
  return (
    <div className="field-type te-specs">
      <FieldLabel label={field.label} path={path} />
      {!productId ? <p className="te-muted">Choose the product first.</p> : null}
      {error ? <p className="te-field-error">{error}</p> : null}
      {axes && axes.length === 0 ? (
        <p className="te-muted">This product has no finish or size options.</p>
      ) : null}
      <div className="te-form-grid">
        {(axes ?? []).map((axis) => (
          <div key={axis.code}>
            <label className="te-label" htmlFor={`option-${axis.code}`}>
              {axis.label} *
            </label>
            <select
              className="te-input"
              id={`option-${axis.code}`}
              onChange={(e) => setValue({ ...values, [axis.code]: e.target.value })}
              value={values[axis.code] ?? ''}
            >
              <option value="">—</option>
              {axis.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}

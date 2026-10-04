'use client'

import { FieldLabel, useField, useFormFields } from '@payloadcms/ui'
import type { JSONFieldClientComponent } from 'payload'
import { useEffect, useMemo, useState } from 'react'

import { callApi } from '@/admin/client/api'

import { relationId, type AttributeDef } from './types'

type Values = Record<string, unknown>
type SetResponse = { attributeSet: { name: string; attributes: AttributeDef[] } | null }

/**
 * Specification inputs built from the main category's attribute set (docs/screens Product
 * editor "Specifications"): selects, numbers with units, yes/no, and the finishes or sizes the
 * product is offered in. Stores one JSON object keyed by attribute code.
 */
export const AttributesField: JSONFieldClientComponent = ({ path: pathFromProps, field }) => {
  const { value, setValue, path } = useField<Values | null>({ potentiallyStalePath: pathFromProps })
  const categoryId = useFormFields(([fields]) => relationId(fields.primaryCategory?.value))
  const [loaded, setLoaded] = useState<{ categoryId: string; result: SetResponse } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!categoryId) return
    let cancelled = false
    void callApi<SetResponse>(`/admin/v1/catalog/categories/${categoryId}/attribute-set`, {
      method: 'GET',
    }).then((response) => {
      if (cancelled) return
      if (response.ok) {
        setLoaded({ categoryId, result: response.data })
        setError(null)
      } else setError(response.error.message)
    })
    return () => {
      cancelled = true
    }
  }, [categoryId])

  const values: Values = value && typeof value === 'object' ? value : {}
  const set = loaded && loaded.categoryId === categoryId ? loaded.result.attributeSet : undefined
  const groups = useMemo(() => {
    const byGroup = new Map<string, AttributeDef[]>()
    for (const attribute of set?.attributes ?? []) {
      const group = attribute.group || 'Details'
      byGroup.set(group, [...(byGroup.get(group) ?? []), attribute])
    }
    return [...byGroup.entries()]
  }, [set])

  const update = (code: string, next: unknown) => setValue({ ...values, [code]: next })
  const toggle = (code: string, option: string) => {
    const current = Array.isArray(values[code]) ? (values[code] as string[]) : []
    update(
      code,
      current.includes(option) ? current.filter((item) => item !== option) : [...current, option],
    )
  }

  return (
    <div className="field-type te-specs">
      <FieldLabel label={field.label} path={path} />
      {!categoryId ? (
        <p className="te-muted">Choose the main category on the Basics tab first.</p>
      ) : null}
      {error ? <p className="te-field-error">{error}</p> : null}
      {categoryId && set === null ? (
        <p className="te-muted">
          This category has no attribute set. Give it one under Catalog, Categories.
        </p>
      ) : null}
      {set
        ? groups.map(([group, attributes]) => (
            <fieldset className="te-fieldset te-specs__group" key={group}>
              <legend className="te-specs__legend">{group}</legend>
              {attributes.map((attribute) => {
                const code = attribute.code ?? ''
                const id = `spec-${code}`
                const label = `${attribute.label}${attribute.unit ? ` (${attribute.unit})` : ''}${attribute.isRequired ? ' *' : ''}`
                const options = (attribute.options ?? []).filter((option) => option.value)
                if (attribute.isVariantAxis || attribute.type === 'multiselect') {
                  const chosen = Array.isArray(values[code]) ? (values[code] as string[]) : []
                  return (
                    <div className="te-specs__row" key={code}>
                      <span className="te-label">
                        {label}
                        {attribute.isVariantAxis ? (
                          <span className="te-muted"> · offered in</span>
                        ) : null}
                      </span>
                      <div className="te-chips">
                        {options.map((option) => (
                          <label className="te-chip" key={option.value}>
                            <input
                              checked={chosen.includes(option.value!)}
                              onChange={() => toggle(code, option.value!)}
                              type="checkbox"
                            />
                            {option.swatchHex ? (
                              <span
                                aria-hidden
                                className="te-swatch"
                                style={{ background: option.swatchHex }}
                              />
                            ) : null}
                            {option.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                }
                if (attribute.type === 'select' || attribute.type === 'color') {
                  return (
                    <div className="te-specs__row" key={code}>
                      <label className="te-label" htmlFor={id}>
                        {label}
                      </label>
                      <select
                        className="te-input"
                        id={id}
                        onChange={(e) => update(code, e.target.value || undefined)}
                        value={typeof values[code] === 'string' ? (values[code] as string) : ''}
                      >
                        <option value="">—</option>
                        {options.map((option) => (
                          <option key={option.value} value={option.value!}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                }
                if (attribute.type === 'boolean') {
                  return (
                    <label className="te-checkbox te-specs__row" key={code}>
                      <input
                        checked={values[code] === true}
                        onChange={(e) => update(code, e.target.checked)}
                        type="checkbox"
                      />
                      {label}
                    </label>
                  )
                }
                return (
                  <div className="te-specs__row" key={code}>
                    <label className="te-label" htmlFor={id}>
                      {label}
                    </label>
                    <input
                      className="te-input"
                      id={id}
                      inputMode={attribute.type === 'number' ? 'decimal' : undefined}
                      onChange={(e) => {
                        const raw = e.target.value
                        if (attribute.type !== 'number') return update(code, raw || undefined)
                        const number = Number(raw)
                        update(code, raw === '' || Number.isNaN(number) ? undefined : number)
                      }}
                      type={attribute.type === 'number' ? 'number' : 'text'}
                      value={
                        values[code] === undefined || values[code] === null
                          ? ''
                          : String(values[code])
                      }
                    />
                  </div>
                )
              })}
            </fieldset>
          ))
        : null}
    </div>
  )
}

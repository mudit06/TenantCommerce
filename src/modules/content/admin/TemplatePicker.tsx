'use client'

import { FieldLabel, useDocumentInfo, useField } from '@payloadcms/ui'
import type { SelectFieldClientComponent } from 'payload'
import { useEffect } from 'react'

import { PAGE_TEMPLATES, type PageTemplate } from '@/admin/ui'
import { Icon } from '@/admin/ui/icons'

const isTemplate = (value: unknown): value is PageTemplate =>
  typeof value === 'string' && value in PAGE_TEMPLATES

/**
 * The page's template as three choices with what each one does (docs/screens Page builder). The
 * stored value is the same select field as before: default, landing or policy.
 */
export const TemplatePicker: SelectFieldClientComponent = ({ field, path, readOnly }) => {
  const { id } = useDocumentInfo()
  const { value, setValue } = useField<string>({ path: path ?? field.name })

  // "Create page" sends the chosen type in the address; only a new page takes it
  useEffect(() => {
    if (id) return
    const chosen = new URLSearchParams(window.location.search).get('template')
    if (isTemplate(chosen) && chosen !== value) setValue(chosen)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the editor opens
  }, [id])

  const current = isTemplate(value) ? value : 'default'
  return (
    <div className="field-type te-template-picker">
      <FieldLabel label={field.label ?? 'Page type'} path={path} required={field.required} />
      <div className="te-template-picker__options" role="radiogroup" aria-label="Page type">
        {(Object.keys(PAGE_TEMPLATES) as PageTemplate[]).map((key) => {
          const info = PAGE_TEMPLATES[key]
          const checked = current === key
          return (
            <label
              className={`te-template-option${checked ? ' te-template-option--checked' : ''}`}
              key={key}
            >
              <input
                checked={checked}
                disabled={readOnly}
                name={`${path}-template`}
                onChange={() => setValue(key)}
                type="radio"
                value={key}
              />
              <span aria-hidden className="te-template-option__icon">
                <Icon name={info.icon} size={16} />
              </span>
              <span className="te-template-option__text">
                <span className="te-template-option__name">{info.label}</span>
                <span className="te-template-option__summary">{info.summary}</span>
              </span>
            </label>
          )
        })}
      </div>
      <p className="te-field-help">
        The type decides the page’s structure on the store. Its look always comes from your store’s
        design.
      </p>
    </div>
  )
}

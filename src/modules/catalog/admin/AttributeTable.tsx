'use client'

import { useFormFields } from '@payloadcms/ui'
import { reduceFieldsToValues } from 'payload/shared'

import { Icon } from '@/admin/ui/icons'

import { ATTRIBUTE_TYPES } from '../constants'

type Option = { label?: string; value?: string; swatchHex?: string | null }
type Attribute = {
  label?: string
  code?: string
  type?: string
  unit?: string
  group?: string
  isFilterable?: boolean
  isVariantAxis?: boolean
  isComparable?: boolean
  isRequired?: boolean
  options?: Option[]
}

const TYPE = new Map<string, string>(ATTRIBUTE_TYPES.map((t) => [t.value, t.label]))

const Tick = ({ on, label }: { on?: boolean; label: string }) =>
  on ? (
    <Icon className="te-text--success" label={label} name="check" size={15} />
  ) : (
    <span aria-label={`Not ${label.toLowerCase()}`} className="te-muted">
      —
    </span>
  )

/**
 * The set's fields as the wireframe's table, and the options of each finish or size, read live
 * from the form as staff edit the fields below (docs/screens `cms-attributes`).
 */
export function AttributeTable() {
  const attributes = useFormFields(([fields]) =>
    ((reduceFieldsToValues(fields, true) as { attributes?: Attribute[] }).attributes ?? []).map(
      (a) => ({ ...a }),
    ),
  )
  const name = useFormFields(([fields]) => fields.name?.value as string | undefined)
  const axes = attributes.filter((a) => a.isVariantAxis && (a.options?.length ?? 0) > 0)

  return (
    <div className="te-attr">
      <section className="te-card te-card--table">
        <header className="te-card__header">
          <h3 className="te-card__title">{name || 'New attribute set'}</h3>
          <a className="te-link te-small" href="#field-attributes">
            Add or edit fields below
          </a>
        </header>
        {attributes.length ? (
          <div className="te-table-scroll">
            <table className="te-table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Code</th>
                  <th>Type</th>
                  <th>Unit</th>
                  <th>Filter</th>
                  <th>Finish option</th>
                  <th>
                    Compare <span className="te-muted te-small">P2</span>
                  </th>
                  <th>Required</th>
                  <th>Group</th>
                </tr>
              </thead>
              <tbody>
                {attributes.map((a, index) => (
                  <tr key={`${a.code ?? ''}-${index}`}>
                    <td>{a.label || <span className="te-muted">Untitled</span>}</td>
                    <td className="te-mono te-small">{a.code || '—'}</td>
                    <td>{TYPE.get(a.type ?? '') ?? a.type ?? '—'}</td>
                    <td>{a.unit || <span className="te-muted">—</span>}</td>
                    <td>
                      <Tick label="Filter" on={a.isFilterable} />
                    </td>
                    <td>
                      <Tick label="Finish option" on={a.isVariantAxis} />
                    </td>
                    <td>
                      <Tick label="Compare" on={a.isComparable} />
                    </td>
                    <td>
                      <Tick label="Required" on={a.isRequired} />
                    </td>
                    <td>{a.group || <span className="te-muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="te-card__body">
            <p className="te-muted te-small">No fields yet. Add the first one below.</p>
          </div>
        )}
      </section>
      <div className="te-attr__below">
        {axes.map((axis) => (
          <section className="te-card" key={axis.code ?? axis.label}>
            <header className="te-card__header">
              <h3 className="te-card__title">Options for {axis.label}</h3>
            </header>
            <div className="te-card__body">
              <ul className="te-rows">
                {axis.options!.map((option, index) => (
                  <li
                    className="te-rows__item te-rows__item--static"
                    key={`${option.value}-${index}`}
                  >
                    <span className="te-inline">
                      <span
                        aria-hidden
                        className="te-swatch"
                        style={option.swatchHex ? { background: option.swatchHex } : undefined}
                      />
                      {option.label}
                    </span>
                    <span className="te-mono te-small te-muted">{option.value}</span>
                  </li>
                ))}
              </ul>
              <p className="te-muted te-small">
                Add an option below, with a swatch colour or photo.
              </p>
            </div>
          </section>
        ))}
        <aside className="te-notice te-notice--info te-attr__callout">
          <Icon name="layout" size={15} />
          <span>
            <b>Other industries, same screen</b>
            <br />
            Locks: lock type, door thickness (mm), key type, number of keys. Clothing: size, colour,
            fabric, fit, sleeve; size and colour as options.
          </span>
        </aside>
      </div>
    </div>
  )
}

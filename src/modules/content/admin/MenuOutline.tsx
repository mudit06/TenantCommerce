'use client'

import { useFormFields } from '@payloadcms/ui'
import { reduceFieldsToValues } from 'payload/shared'

import { Pill } from '@/admin/ui'

type Link = { type?: string; url?: string | null }
type Item = {
  label?: string
  link?: Link
  columns?: { heading?: string; links?: { label?: string; link?: Link }[] }[]
  featuredImage?: unknown
}
type Menus = {
  header?: Item[]
  footer?: { heading?: string; links?: { label?: string }[] }[]
  mobileSameAsHeader?: boolean
  mobile?: { label?: string }[]
}

const KIND: Record<string, string> = {
  page: 'Page',
  category: 'Category',
  product: 'Product',
  url: 'Web address',
}

/**
 * The menus as the wireframe draws them (docs/screens `cms-navigation`): the header menu with
 * its dropdown columns, read live from the editors below so a change shows straight away.
 */
export function MenuOutline() {
  const menus = useFormFields(([fields]) => reduceFieldsToValues(fields, true) as Menus)
  const header = menus.header ?? []
  return (
    <section className="te-card te-menu-outline">
      <header className="te-card__header">
        <h3 className="te-card__title">Header menu</h3>
        <a className="te-link te-small" href="#field-header">
          Add or edit items below
        </a>
      </header>
      <div className="te-card__body">
        {header.length ? (
          <ol className="te-menu-tree">
            {header.map((item, index) => (
              <li key={index}>
                <span className="te-menu-tree__item te-menu-tree__item--top">
                  <b>{item.label || 'Untitled'}</b>
                  {item.columns?.length ? (
                    <Pill tone="info">
                      Dropdown, {item.columns.length} column{item.columns.length === 1 ? '' : 's'}
                    </Pill>
                  ) : null}
                  {item.featuredImage ? <Pill tone="neutral">Featured image</Pill> : null}
                  <span className="te-menu-tree__kind">
                    {KIND[item.link?.type ?? ''] ?? 'Link'}
                  </span>
                </span>
                {item.columns?.length ? (
                  <ol>
                    {item.columns.flatMap((column, c) => [
                      column.heading ? (
                        <li className="te-menu-tree__heading" key={`h${c}`}>
                          {column.heading}
                        </li>
                      ) : null,
                      ...(column.links ?? []).map((link, l) => (
                        <li key={`${c}-${l}`}>
                          <span className="te-menu-tree__item">
                            {link.label || 'Untitled'}
                            <span className="te-menu-tree__kind">
                              {KIND[link.link?.type ?? ''] ?? 'Link'}
                            </span>
                          </span>
                        </li>
                      )),
                    ])}
                  </ol>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="te-muted te-small">No menu items yet. Add the first one below.</p>
        )}
        <p className="te-muted te-small">
          An item can go to a category, a page, a product or any web address; category links follow
          a renamed category. A top item can open a dropdown of up to four columns and an image.
        </p>
      </div>
    </section>
  )
}

/** Footer columns and the phone menu at a glance, above their editors in the side column. */
export function MenuSideSummary() {
  const menus = useFormFields(([fields]) => reduceFieldsToValues(fields, true) as Menus)
  const footer = menus.footer ?? []
  return (
    <section className="te-card te-card--sidebar">
      <header className="te-card__header">
        <h3 className="te-card__title">Footer</h3>
      </header>
      <div className="te-card__body">
        {footer.length ? (
          <div className="te-footer-cols">
            {footer.map((column, index) => (
              <div key={index}>
                <b className="te-small">{column.heading || 'Untitled'}</b>
                <div className="te-muted te-small">
                  {(column.links ?? [])
                    .map((l) => l.label)
                    .filter(Boolean)
                    .join(', ') || '—'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="te-muted te-small">No footer columns yet.</p>
        )}
        <p className="te-small">
          <b>Phone menu:</b>{' '}
          {menus.mobileSameAsHeader === false
            ? `${menus.mobile?.length ?? 0} items of its own`
            : 'same as the header menu'}
        </p>
      </div>
    </section>
  )
}

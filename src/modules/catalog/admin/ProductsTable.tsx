'use client'

import { Button, toast } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { callApi } from '@/admin/client/api'
import { Pill } from '@/admin/ui'

export type ProductTableRow = {
  id: string
  href: string
  title: string
  modelNumber: string
  thumb: string | null
  category: string
  variants: string
  price: string | null
  enquireOnly: boolean
  stock: { qty: number; note: string | null } | null
  status: 'draft' | 'active' | 'archived'
  updated: string
}

type BulkResult = { changed: number; failed: { id: string; title: string; reason: string }[] }

const STATUS = {
  active: { tone: 'success', text: 'Active' },
  draft: { tone: 'neutral', text: 'Draft' },
  archived: { tone: 'neutral', text: 'Archived' },
} as const

/**
 * The products table with ticks and the bulk actions above it (docs/screens `cms-products`):
 * Publish, Archive, Change category and Export selected.
 */
export function ProductsTable({
  rows,
  storeId,
  canWrite,
  categories,
}: {
  rows: ProductTableRow[]
  storeId: string
  canWrite: boolean
  categories: { value: string; label: string }[]
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [category, setCategory] = useState('')
  const [choosing, setChoosing] = useState(false)
  const allTicked = rows.length > 0 && rows.every((row) => selected.has(row.id))

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const run = async (action: 'publish' | 'archive' | 'category', verb: string) => {
    setBusy(true)
    const result = await callApi<BulkResult>('/admin/v1/catalog/products/bulk', {
      body: {
        store: storeId,
        ids: [...selected],
        action,
        ...(action === 'category' ? { categoryId: category } : {}),
      },
    })
    setBusy(false)
    if (!result.ok) return toast.error(result.error.message)
    const { changed, failed } = result.data
    if (changed) toast.success(`${changed} product${changed === 1 ? '' : 's'} ${verb}`)
    for (const failure of failed.slice(0, 3)) toast.error(`${failure.title}: ${failure.reason}`)
    if (failed.length > 3) toast.error(`${failed.length - 3} more couldn’t be changed`)
    setSelected(new Set(failed.map((f) => f.id)))
    setChoosing(false)
    router.refresh()
  }

  const exportHref = `/api/admin/v1/imports/export/products?store=${storeId}&ids=${[...selected].join(',')}`

  return (
    <div className="te-card te-card--table">
      {canWrite ? (
        <div className={`te-bulkbar${selected.size ? ' te-bulkbar--active' : ''}`}>
          <label className="te-checkbox">
            <input
              aria-label="Tick every product shown"
              checked={allTicked}
              onChange={() =>
                setSelected(allTicked ? new Set() : new Set(rows.map((row) => row.id)))
              }
              type="checkbox"
            />
            <span>{selected.size ? <b>{selected.size} selected</b> : 'Select'}</span>
          </label>
          <Button
            buttonStyle="secondary"
            disabled={busy || selected.size === 0}
            onClick={() => void run('publish', 'published')}
            size="small"
          >
            Publish
          </Button>
          <Button
            buttonStyle="secondary"
            disabled={busy || selected.size === 0}
            onClick={() => void run('archive', 'archived')}
            size="small"
          >
            Archive
          </Button>
          <Button
            buttonStyle="secondary"
            disabled={busy || selected.size === 0}
            onClick={() => setChoosing((open) => !open)}
            size="small"
          >
            Change category
          </Button>
          <a
            aria-disabled={selected.size === 0}
            className={`btn btn--style-secondary btn--size-small${selected.size === 0 ? ' btn--disabled' : ''}`}
            href={selected.size ? exportHref : undefined}
          >
            Export selected
          </a>
        </div>
      ) : null}
      {choosing && selected.size ? (
        <div className="te-csv-box">
          <label className="te-label" htmlFor="bulk-category">
            Move {selected.size} product{selected.size === 1 ? '' : 's'} to
          </label>
          <div className="te-inline-field">
            <select
              className="te-input"
              id="bulk-category"
              onChange={(event) => setCategory(event.target.value)}
              value={category}
            >
              <option value="">Choose a category</option>
              {categories.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Button
              disabled={busy || !category}
              onClick={() => void run('category', 'moved')}
              size="small"
            >
              Move
            </Button>
          </div>
          <span className="te-muted te-small">
            The new category’s attribute set decides the specification fields. A product whose
            specifications don’t fit stays where it is and is listed.
          </span>
        </div>
      ) : null}
      <div className="te-table-scroll">
        <table className="te-table te-table--rows te-table--clickable">
          <thead>
            <tr>
              {canWrite ? <th aria-label="Select" className="te-col-check" /> : null}
              <th>Product</th>
              <th>Category</th>
              <th>Variants</th>
              <th className="te-num">Price</th>
              <th className="te-num">In stock</th>
              <th>Status</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className={selected.has(row.id) ? 'te-row--selected' : undefined} key={row.id}>
                {canWrite ? (
                  <td className="te-col-check">
                    <input
                      aria-label={`Select ${row.title}`}
                      checked={selected.has(row.id)}
                      onChange={() => toggle(row.id)}
                      type="checkbox"
                    />
                  </td>
                ) : null}
                <td>
                  <div className="te-product-cell">
                    <span
                      aria-hidden
                      className="te-product-cell__thumb"
                      style={row.thumb ? { backgroundImage: `url(${row.thumb})` } : undefined}
                    />
                    <span>
                      <a className="te-table__primary" href={row.href}>
                        {row.title}
                      </a>
                      <span className="te-mono te-small te-muted te-block">{row.modelNumber}</span>
                    </span>
                  </div>
                </td>
                <td>{row.category}</td>
                <td className="te-nowrap">{row.variants}</td>
                <td className="te-num te-nowrap">
                  {row.enquireOnly ? (
                    <Pill tone="neutral">Enquire only</Pill>
                  ) : (
                    (row.price ?? <span className="te-muted">No price</span>)
                  )}
                </td>
                <td className="te-num">
                  {row.stock ? (
                    <>
                      <b
                        className={
                          row.stock.note === 'Out of stock' ? 'te-text--danger' : undefined
                        }
                      >
                        {row.stock.qty.toLocaleString('en-IN')}
                      </b>
                      {row.stock.note ? (
                        <span
                          className={`te-block te-small ${row.stock.note === 'Low' ? 'te-text--warning' : 'te-text--danger'}`}
                        >
                          {row.stock.note}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span className="te-muted">—</span>
                  )}
                </td>
                <td>
                  <Pill tone={STATUS[row.status].tone}>{STATUS[row.status].text}</Pill>
                </td>
                <td className="te-nowrap">{row.updated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

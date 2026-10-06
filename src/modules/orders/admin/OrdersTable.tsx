'use client'

import { Button, toast } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { callApi } from '@/admin/client/api'
import { Pill, type Tone } from '@/admin/ui'

export type OrderRow = {
  id: string
  href: string
  orderNumber: string
  placed: string
  customer: string
  place: string
  items: number
  total: string
  payment: { tone: Tone; text: string; detail: string | null }
  delivery: { tone: Tone; text: string; detail: string | null }
  canPack: boolean
  hasInvoice: boolean
}

type BulkResult = {
  results: { ok: boolean; message?: string; orderNumber?: string; orderId?: string }[]
}

/** "order no, courier, tracking number" per line, with or without a header row */
function parseShippedCsv(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, '')))
    .filter((cells) => cells.length >= 3 && cells[0] && !/^order/i.test(cells[0]))
    .map(([orderNumber, carrier, trackingNumber, trackingUrl]) => ({
      orderNumber: orderNumber!,
      carrier: carrier!,
      trackingNumber: trackingNumber!,
      trackingUrl: trackingUrl || undefined,
    }))
}

/** The orders table with ticks and the bulk actions above it (docs/screens Orders). */
export function OrdersTable({
  rows,
  storeId,
  canWrite,
}: {
  rows: OrderRow[]
  storeId: string
  canWrite: boolean
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [csvOpen, setCsvOpen] = useState(false)
  const [csv, setCsv] = useState('')
  const allTicked = rows.length > 0 && rows.every((row) => selected.has(row.id))

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const report = (result: BulkResult, verb: string) => {
    const failed = result.results.filter((r) => !r.ok)
    const done = result.results.length - failed.length
    if (done) toast.success(`${done} order${done === 1 ? '' : 's'} ${verb}`)
    for (const failure of failed.slice(0, 3)) {
      toast.error(
        `${failure.orderNumber ?? rows.find((r) => r.id === failure.orderId)?.orderNumber ?? ''}: ${failure.message}`,
      )
    }
  }

  const markPacked = async () => {
    setBusy(true)
    const result = await callApi<BulkResult>('/admin/v1/orders/bulk-pack', {
      body: { orderIds: [...selected] },
    })
    setBusy(false)
    if (!result.ok) return toast.error(result.error.message)
    report(result.data, 'packed')
    setSelected(new Set())
    router.refresh()
  }

  const shipFromCsv = async () => {
    const parsed = parseShippedCsv(csv)
    if (!parsed.length) return toast.error('Paste lines like: AQV-10482, Delhivery, 1490221004 58')
    setBusy(true)
    const result = await callApi<BulkResult>('/admin/v1/shipments/bulk-shipped', {
      body: { store: storeId, rows: parsed },
    })
    setBusy(false)
    if (!result.ok) return toast.error(result.error.message)
    report(result.data, 'marked shipped')
    setCsv('')
    setCsvOpen(false)
    router.refresh()
  }

  const invoicesHref = `/api/admin/v1/orders/invoices?ids=${[...selected].join(',')}`

  return (
    <div className="te-card te-card--table">
      {canWrite ? (
        <div className="te-bulkbar">
          <label className="te-checkbox">
            <input
              aria-label="Tick every order shown"
              checked={allTicked}
              onChange={() =>
                setSelected(allTicked ? new Set() : new Set(rows.map((row) => row.id)))
              }
              type="checkbox"
            />
            <span>{selected.size ? `${selected.size} selected` : 'Select'}</span>
          </label>
          <Button
            buttonStyle="secondary"
            disabled={busy || selected.size === 0}
            onClick={() => void markPacked()}
            size="small"
          >
            Mark packed
          </Button>
          <Button
            buttonStyle="secondary"
            disabled={busy}
            onClick={() => setCsvOpen((open) => !open)}
            size="small"
          >
            Shipped from CSV
          </Button>
          <a
            aria-disabled={selected.size === 0}
            className={`btn btn--style-secondary btn--size-small${selected.size === 0 ? ' btn--disabled' : ''}`}
            href={selected.size ? invoicesHref : undefined}
            rel="noreferrer"
            target="_blank"
          >
            Download invoices
          </a>
        </div>
      ) : null}
      {csvOpen ? (
        <div className="te-csv-box">
          <label className="te-label" htmlFor="shipped-csv">
            One parcel per line: order number, courier, tracking number (and an optional tracking
            link)
          </label>
          <textarea
            className="te-input"
            id="shipped-csv"
            onChange={(event) => setCsv(event.target.value)}
            placeholder={'AQV-10482, Delhivery, 14902210045 8\nAQV-10481, Blue Dart, 7710023344'}
            rows={5}
            value={csv}
          />
          <div className="te-button-row">
            <Button disabled={busy || !csv.trim()} onClick={() => void shipFromCsv()} size="small">
              Mark them shipped
            </Button>
            <span className="te-muted te-small">
              Each shopper is told their parcel has shipped.
            </span>
          </div>
        </div>
      ) : null}
      <div className="te-table-scroll">
        <table className="te-table te-table--rows">
          <thead>
            <tr>
              {canWrite ? <th aria-label="Select" /> : null}
              <th>Order</th>
              <th>Placed</th>
              <th>Customer</th>
              <th className="te-num">Items</th>
              <th className="te-num">Total</th>
              <th>Payment</th>
              <th>Delivery</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {canWrite ? (
                  <td>
                    <input
                      aria-label={`Select ${row.orderNumber}`}
                      checked={selected.has(row.id)}
                      onChange={() => toggle(row.id)}
                      type="checkbox"
                    />
                  </td>
                ) : null}
                <td>
                  <a className="te-mono te-strong te-link" href={row.href}>
                    {row.orderNumber}
                  </a>
                </td>
                <td className="te-nowrap">{row.placed}</td>
                <td>
                  <div>{row.customer}</div>
                  <div className="te-muted te-small">{row.place}</div>
                </td>
                <td className="te-num">{row.items}</td>
                <td className="te-num te-nowrap">{row.total}</td>
                <td>
                  <Pill tone={row.payment.tone}>{row.payment.text}</Pill>
                  {row.payment.detail ? (
                    <div className="te-muted te-small">{row.payment.detail}</div>
                  ) : null}
                </td>
                <td>
                  <Pill tone={row.delivery.tone}>{row.delivery.text}</Pill>
                  {row.delivery.detail ? (
                    <div className="te-muted te-small">{row.delivery.detail}</div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

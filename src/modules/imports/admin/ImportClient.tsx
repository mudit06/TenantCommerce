'use client'

import { toast } from '@payloadcms/ui'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { callApi } from '@/admin/client/api'
import { Card, Empty, Figure, Notice, Pill } from '@/admin/ui'

import type { ImportKind } from '../constants'
import type { RowError } from '../services/cells'

export type JobView = {
  id: string
  kind: string
  kindLabel: string
  filename: string
  status: string
  statusLabel: string
  by: string
  at: string
  rows: number
  create: number
  update: number
  errorRows: number
  errors: RowError[]
  errorCount: number
  result: { created: number; updated: number; skipped: number } | null
}

const TONE: Record<string, 'success' | 'warning' | 'danger' | 'neutral' | 'info'> = {
  checked: 'info',
  queued: 'warning',
  running: 'warning',
  done: 'success',
  failed: 'danger',
  cancelled: 'neutral',
}

const n = (value: number) => value.toLocaleString('en-IN')

/** Upload, check, import and the recent imports (docs/screens CSV import). */
export function ImportClient({
  current,
  kinds,
  recent,
  storeId,
}: {
  current: JobView | null
  kinds: { value: ImportKind; label: string }[]
  recent: JobView[]
  storeId: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [kind, setKind] = useState<ImportKind>(kinds[0]!.value)
  const [busy, setBusy] = useState(false)

  // While an import runs, look again every few seconds
  const running = current && (current.status === 'queued' || current.status === 'running')
  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => router.refresh(), 4000)
    return () => window.clearInterval(timer)
  }, [running, router])

  const upload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Files up to 5 MB: split it into smaller files.')
      return
    }
    setBusy(true)
    const csv = await file.text()
    const result = await callApi<{ id: string }>(`/admin/v1/imports?store=${storeId}`, {
      body: { kind: current?.status === 'checked' ? current.kind : kind, filename: file.name, csv },
    })
    setBusy(false)
    if (!result.ok) {
      toast.error(result.error.message)
      return
    }
    router.replace(`${pathname}?job=${result.data.id}`)
    router.refresh()
  }

  const act = async (path: 'run' | 'cancel') => {
    if (!current) return
    setBusy(true)
    const result = await callApi(`/admin/v1/imports/${current.id}/${path}?store=${storeId}`, {
      body: {},
    })
    setBusy(false)
    if (!result.ok) toast.error(result.error.message)
    else if (path === 'cancel') router.replace(pathname)
    router.refresh()
  }

  const ready = current ? current.rows - current.errorRows : 0
  const filePicker = (label: string, primary = false) => (
    <label
      className={`te-button ${primary ? 'te-button--primary' : 'te-button--secondary'} te-button--small`}
    >
      {busy ? 'Checking…' : label}
      <input
        accept=".csv,text/csv"
        disabled={busy}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void upload(file)
        }}
        type="file"
      />
    </label>
  )

  return (
    <div className="te-coupon-layout">
      <div className="te-stack">
        {current ? (
          <>
            <ol aria-label="Steps" className="te-steps">
              <li className="te-steps__done">Upload file</li>
              <li className="te-steps__done">Check</li>
              <li className={current.status === 'checked' ? 'te-steps__now' : 'te-steps__done'}>
                Import
              </li>
            </ol>
            <div className="te-figures">
              <Figure label="Rows in file" value={n(current.rows)} />
              {current.kind === 'products' ? (
                <Figure label="New products" value={n(current.create)} />
              ) : current.kind === 'dealers' ? (
                <Figure label="New dealers" value={n(current.create)} />
              ) : null}
              <Figure hint="matched on SKU" label="Updates" value={n(current.update)} />
              <Figure
                hint="will be skipped"
                label="Rows with errors"
                tone={current.errorRows ? 'danger' : undefined}
                value={n(current.errorRows)}
              />
            </div>
            {current.status === 'checked' ? (
              <Notice tone={current.errorRows ? 'warning' : 'success'}>
                ✓ Check finished. Nothing has changed yet. {n(ready)} row
                {ready === 1 ? ' is' : 's are'} ready.
                {current.errorRows
                  ? ` Fix the ${n(current.errorRows)} row${current.errorRows === 1 ? '' : 's'} below, or import the ready rows now.`
                  : ''}
              </Notice>
            ) : current.result ? (
              <Notice tone={current.result.skipped ? 'warning' : 'success'}>
                Imported: {n(current.result.created)} created, {n(current.result.updated)} updated
                {current.result.skipped ? `, ${n(current.result.skipped)} rows skipped` : ''}.
                {current.kind === 'products' && current.result.created
                  ? ' New products are drafts: add their photos, then make them active.'
                  : ''}
              </Notice>
            ) : (
              <Notice tone="info">
                {current.statusLabel}… Runs in the background; you’ll get an email when it finishes.
              </Notice>
            )}
            {current.errorCount ? (
              <Card
                actions={
                  <a
                    className="te-button te-button--secondary te-button--small"
                    href={`/api/admin/v1/imports/${current.id}/errors.csv?store=${storeId}`}
                  >
                    Download error report
                  </a>
                }
                title="Rows with errors"
              >
                <div className="te-table-scroll">
                  <table className="te-table">
                    <thead>
                      <tr>
                        <th className="te-num">Row</th>
                        <th>Column</th>
                        <th>What to fix</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {current.errors.map((e, i) => (
                        <tr key={`${e.row}-${e.column}-${i}`}>
                          <td className="te-num">{e.row}</td>
                          <td className="te-mono te-small">{e.column || '—'}</td>
                          <td>{e.message}</td>
                          <td className="te-small">{e.value || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {current.errorCount > current.errors.length ? (
                  <p className="te-muted te-small">
                    Showing {current.errors.length} of {n(current.errorCount)}
                  </p>
                ) : null}
              </Card>
            ) : null}
            {current.status === 'checked' ? (
              <div className="te-inline-actions">
                {filePicker('Upload a fixed file')}
                <button
                  className="te-button te-button--primary te-button--small"
                  disabled={busy || ready === 0}
                  onClick={() => act('run')}
                  type="button"
                >
                  Import {n(ready)} ready rows
                </button>
                <button
                  className="te-button te-button--ghost te-button--small"
                  disabled={busy}
                  onClick={() => act('cancel')}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div>
                <button
                  className="te-button te-button--secondary te-button--small"
                  onClick={() => router.replace(pathname)}
                  type="button"
                >
                  New import
                </button>
              </div>
            )}
            {current.status === 'checked' ? (
              <p className="te-muted te-small">
                Runs in the background. You’ll get an email when it finishes.
              </p>
            ) : null}
          </>
        ) : (
          <Card title="Upload a file">
            <div className="te-stack">
              <fieldset className="te-fieldset">
                <legend className="te-label">Import type</legend>
                {kinds.map((k) => (
                  <label className="te-checkbox" key={k.value}>
                    <input
                      checked={kind === k.value}
                      name="import-kind"
                      onChange={() => setKind(k.value)}
                      type="radio"
                    />
                    {k.label}
                  </label>
                ))}
              </fieldset>
              <p className="te-small">
                A CSV file (save your spreadsheet as CSV), up to 5,000 rows. Every row is checked
                first; nothing in the store changes until you confirm.
              </p>
              <div>{filePicker('Choose CSV file', true)}</div>
            </div>
          </Card>
        )}
      </div>

      <div className="te-stack">
        <Card title="Templates">
          <ul className="te-list te-small">
            {kinds.map((k) => (
              <li className="te-list__row" key={k.value}>
                <span className="te-grow">{k.label.split(':')[0]} template</span>
                <a href={`/api/admin/v1/imports/template?kind=${k.value}`}>Download</a>
              </li>
            ))}
          </ul>
          <p className="te-muted te-small">
            Products: one row per finish or size, grouped by product_handle. Prices in rupees,
            including GST. New products come in as drafts until they have photos.
          </p>
        </Card>
        <Card title="Recent imports">
          {recent.length ? (
            <ul className="te-list te-small">
              {recent.map((j) => (
                <li className="te-list__row" key={j.id}>
                  <span className="te-grow">
                    <a href={`?job=${j.id}`}>{j.filename}</a>
                    <div className="te-muted">
                      {j.kindLabel.split(':')[0]} · {n(j.rows)} rows
                      {j.result?.skipped ? `, ${n(j.result.skipped)} skipped` : ''} · {j.at}
                    </div>
                  </span>
                  <Pill tone={TONE[j.status] ?? 'neutral'}>{j.statusLabel}</Pill>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No imports yet.</Empty>
          )}
        </Card>
      </div>
    </div>
  )
}

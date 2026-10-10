'use client'

import { toast } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { callApi } from '@/admin/client/api'
import { Card, Empty, Pill } from '@/admin/ui'

export type PrivacyRow = {
  id: string
  type: string
  typeLabel: string
  who: string
  hasAccount: boolean
  status: string
  statusLabel: string
  when: string
  overdue: boolean
  notes: string
}

const NEXT: Record<string, { status: string; label: string }[]> = {
  received: [
    { status: 'in_progress', label: 'Start' },
    { status: 'rejected', label: 'Reject' },
  ],
  in_progress: [
    { status: 'done', label: 'Mark done' },
    { status: 'rejected', label: 'Reject' },
  ],
}

/**
 * Privacy requests (docs/screens Customers rule 2, DPDP Act): record what the shopper asked,
 * download their data for an export, and delete the account when a deletion is done.
 */
export function PrivacyRequestsCard({
  rows,
  storeId,
  canWrite,
}: {
  rows: PrivacyRow[]
  storeId: string
  canWrite: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [form, setForm] = useState({ type: 'export', email: '', phone: '', notes: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const record = async () => {
    setBusy('new')
    setErrors({})
    const result = await callApi(`/admin/v1/privacy-requests?store=${storeId}`, { body: form })
    setBusy(null)
    if (!result.ok) {
      setErrors(result.error.fields ?? {})
      toast.error(result.error.message)
      return
    }
    toast.success('Request recorded. It is due in 30 days.')
    setForm({ type: 'export', email: '', phone: '', notes: '' })
    setOpen(false)
    router.refresh()
  }

  const move = async (row: PrivacyRow, status: string) => {
    if (
      status === 'done' &&
      row.type === 'deletion' &&
      !window.confirm(
        `Delete the account of ${row.who}? Saved addresses, sessions and preferences are removed. Orders and invoices stay, as tax law requires. This can’t be undone.`,
      )
    ) {
      return
    }
    setBusy(row.id)
    const result = await callApi(`/admin/v1/privacy-requests/${row.id}?store=${storeId}`, {
      body: { status },
    })
    setBusy(null)
    if (!result.ok) {
      toast.error(result.error.message)
      return
    }
    toast.success(status === 'done' && row.type === 'deletion' ? 'Account deleted' : 'Updated')
    router.refresh()
  }

  return (
    <Card
      actions={
        canWrite && !open ? (
          <button
            className="te-button te-button--secondary te-button--small"
            onClick={() => setOpen(true)}
            type="button"
          >
            Record a request
          </button>
        ) : null
      }
      title="Privacy requests"
    >
      <div className="te-stack">
        <p className="te-muted te-small">
          Under India’s DPDP Act a shopper can ask for their data, a correction, or deletion. Orders
          keep what tax law requires.
        </p>
        {open ? (
          <div className="te-form">
            <div className="te-form-grid te-form-grid--3">
              <div>
                <label className="te-label" htmlFor="privacy-type">
                  Request
                </label>
                <select
                  className="te-input"
                  id="privacy-type"
                  onChange={(event) => setForm({ ...form, type: event.target.value })}
                  value={form.type}
                >
                  <option value="export">Data export</option>
                  <option value="correction">Correction</option>
                  <option value="deletion">Delete account</option>
                </select>
              </div>
              <div>
                <label className="te-label" htmlFor="privacy-email">
                  Shopper’s email
                </label>
                <input
                  className="te-input"
                  id="privacy-email"
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  type="email"
                  value={form.email}
                />
                {errors.email ? <p className="te-field-error">{errors.email}</p> : null}
              </div>
              <div>
                <label className="te-label" htmlFor="privacy-phone">
                  Or phone
                </label>
                <input
                  className="te-input"
                  id="privacy-phone"
                  inputMode="tel"
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  value={form.phone}
                />
              </div>
            </div>
            <div>
              <label className="te-label" htmlFor="privacy-notes">
                How it arrived and what they asked
              </label>
              <textarea
                className="te-input"
                id="privacy-notes"
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                rows={2}
                value={form.notes}
              />
            </div>
            <div className="te-button-row">
              <button
                className="te-button te-button--primary te-button--small"
                disabled={busy !== null}
                onClick={record}
                type="button"
              >
                {busy === 'new' ? 'Saving…' : 'Record request'}
              </button>
              <button
                className="te-button te-button--ghost te-button--small"
                onClick={() => setOpen(false)}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
        {rows.length === 0 ? (
          <Empty>No privacy requests.</Empty>
        ) : (
          <ul className="te-rows">
            {rows.map((row) => (
              <li className="te-rows__item" key={row.id}>
                <div className="te-rows__item--static">
                  <div className="te-rows__main">
                    <div className="te-rows__primary">
                      {row.typeLabel} · {row.who}
                    </div>
                    <div className="te-rows__secondary">
                      {row.hasAccount ? 'Has an account' : 'No account: guest orders only'}
                      {row.notes ? ` · ${row.notes}` : ''}
                    </div>
                  </div>
                  <div className="te-inline-actions">
                    <Pill
                      tone={
                        row.status === 'done'
                          ? 'success'
                          : row.status === 'rejected'
                            ? 'neutral'
                            : row.overdue
                              ? 'danger'
                              : 'warning'
                      }
                    >
                      {row.when}
                    </Pill>
                    {canWrite && row.type === 'export' && row.status !== 'rejected' ? (
                      <a
                        className="te-button te-button--ghost te-button--small"
                        href={`/api/admin/v1/privacy-requests/${row.id}/export?store=${storeId}`}
                      >
                        Download data
                      </a>
                    ) : null}
                    {canWrite
                      ? (NEXT[row.status] ?? []).map((next) => (
                          <button
                            className={`te-button te-button--small ${next.status === 'done' && row.type === 'deletion' ? 'te-button--danger' : 'te-button--ghost'}`}
                            disabled={busy !== null}
                            key={next.status}
                            onClick={() => move(row, next.status)}
                            type="button"
                          >
                            {next.status === 'done' && row.type === 'deletion'
                              ? 'Delete account'
                              : next.label}
                          </button>
                        ))
                      : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}

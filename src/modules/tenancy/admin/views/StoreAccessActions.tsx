'use client'

import { Button, toast } from '@payloadcms/ui'
import { useState } from 'react'

import { callApi } from '@/admin/client/api'
import { ADMIN } from '@/admin/paths'

type Mode = 'manage' | 'view'

const COPY: Record<Mode, { label: string; consequence: string; placeholder: string }> = {
  manage: {
    label: 'Manage store',
    consequence:
      'Opens this store’s CMS with full edit rights for 2 hours. Every change is logged with your name and this reason, and the store owner can see it.',
    placeholder: 'For example: vendor asked us to set up the Diwali landing page',
  },
  view: {
    label: 'View as support',
    consequence:
      'Opens this store’s CMS read-only for 2 hours. The visit is logged with your name and this reason.',
    placeholder: 'For example: vendor reported a missing product photo',
  },
}

/**
 * "Manage store" and "View as support" on the vendor overview (docs/screens `sa-vendor` rule 2).
 * Asks for the reason once, then opens the store's CMS in this window.
 */
export function StoreAccessActions({
  tenantId,
  canManage,
  inline = false,
}: {
  tenantId: string
  canManage: boolean
  /** The "Manage this store" card: the reason field and Manage store, always shown */
  inline?: boolean
}) {
  const [mode, setMode] = useState<Mode | null>(inline ? 'manage' : null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const open = async () => {
    if (!mode) return
    if (reason.trim().length < 5) {
      setError('Say in a few words why you are opening this store.')
      return
    }
    setBusy(true)
    setError(null)
    const result = await callApi('/admin/v1/platform/store-session', {
      body: { tenantId, mode, reason: reason.trim() },
    })
    if (!result.ok) {
      setBusy(false)
      setError(result.error.fields?.reason ?? result.error.message)
      toast.error(result.error.message)
      return
    }
    window.location.assign(ADMIN)
  }

  const modes: Mode[] = canManage ? ['manage', 'view'] : ['view']
  if (inline) {
    return (
      <div className="te-store-access te-store-access--inline">
        <div className="te-inline-field">
          <label className="te-visually-hidden" htmlFor="te-manage-reason">
            Reason
          </label>
          <input
            aria-describedby="te-manage-reason-hint"
            aria-invalid={Boolean(error)}
            className="te-input"
            id="te-manage-reason"
            maxLength={300}
            onChange={(event) => setReason(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void open()
              }
            }}
            placeholder="Reason, for example: vendor asked us to set up the Diwali scheme"
            value={reason}
          />
          <Button buttonStyle="primary" disabled={busy} onClick={() => void open()} size="small">
            {busy ? 'Opening…' : 'Manage store'}
          </Button>
        </div>
        {error ? <p className="te-field-error">{error}</p> : null}
        <p className="te-muted te-small" id="te-manage-reason-hint">
          Full edit for 2 hours. Every change is logged with your name and this reason.
        </p>
      </div>
    )
  }
  return (
    <div className="te-store-access">
      <div className="te-store-access__buttons">
        {modes.map((key) => (
          <Button
            buttonStyle={key === 'manage' ? 'primary' : 'secondary'}
            disabled={busy}
            key={key}
            onClick={() => {
              setMode(key)
              setError(null)
            }}
            size="small"
          >
            {COPY[key].label}
          </Button>
        ))}
      </div>
      {mode ? (
        // Not a <form>: this sits inside Payload's vendor form, so Enter is handled here
        <div
          aria-label={COPY[mode].label}
          className="te-confirm te-confirm--info"
          onKeyDown={(event) => {
            if (event.key === 'Escape') setMode(null)
            if (event.key === 'Enter' && (event.target as HTMLElement).tagName === 'INPUT') {
              event.preventDefault()
              void open()
            }
          }}
          role="group"
        >
          <p>{COPY[mode].consequence}</p>
          <label className="te-label" htmlFor="te-store-access-reason">
            Reason <span className="te-required">*</span>
          </label>
          <input
            aria-describedby={error ? 'te-store-access-error' : undefined}
            aria-invalid={Boolean(error)}
            autoFocus
            className="te-input"
            id="te-store-access-reason"
            maxLength={300}
            onChange={(event) => setReason(event.target.value)}
            placeholder={COPY[mode].placeholder}
            value={reason}
          />
          {error ? (
            <p className="te-field-error" id="te-store-access-error">
              {error}
            </p>
          ) : null}
          <div className="te-confirm__buttons">
            <Button buttonStyle="primary" disabled={busy} onClick={() => void open()} size="small">
              {busy ? 'Opening…' : `Open the store’s CMS`}
            </Button>
            <Button
              buttonStyle="secondary"
              disabled={busy}
              onClick={() => setMode(null)}
              size="small"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

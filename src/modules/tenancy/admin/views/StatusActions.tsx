'use client'

import { Button, toast } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { callApi } from '@/admin/client/api'

type Action = {
  key: 'activate' | 'suspend' | 'resume' | 'archive'
  label: string
  needsReason: boolean
  danger?: boolean
}

const ACTIONS: Record<string, Action[]> = {
  draft: [{ key: 'activate', label: 'Go live', needsReason: false }],
  active: [{ key: 'suspend', label: 'Suspend store', needsReason: true, danger: true }],
  suspended: [
    { key: 'resume', label: 'Resume store', needsReason: false },
    { key: 'archive', label: 'Archive', needsReason: true, danger: true },
  ],
  archived: [],
}

const CONSEQUENCE: Record<Action['key'], string> = {
  activate: 'Shoppers can open the store and place orders.',
  suspend:
    'Shoppers see “store unavailable”, checkout stops and staff edits are blocked. Nothing is deleted.',
  resume: 'The store comes back exactly as it was.',
  archive: 'The storefront goes off for good. Data is kept for the retention period.',
}

/** Go live, Suspend, Resume, Archive (docs/screens Vendor overview rule 1). Super admins only. */
export function StatusActions({
  tenantId,
  status,
  storeUrl,
}: {
  tenantId: string
  status: string
  storeUrl?: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState<Action | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async (action: Action) => {
    setBusy(true)
    const result = await callApi(`/admin/v1/platform/tenants/${tenantId}/${action.key}`, {
      body: { reason: reason.trim() || undefined },
    })
    setBusy(false)
    if (!result.ok) {
      toast.error(result.error.message)
      return
    }
    toast.success(`${action.label}: done`)
    setPending(null)
    setReason('')
    router.refresh()
  }

  return (
    <div className="te-status-actions">
      <div className="te-status-actions__buttons">
        {storeUrl ? (
          <a
            className="btn btn--style-secondary btn--size-small te-btn"
            href={storeUrl}
            rel="noreferrer"
            target="_blank"
          >
            View store
          </a>
        ) : null}
        {(ACTIONS[status] ?? []).map((action) => (
          <Button
            buttonStyle={action.danger ? 'error' : 'primary'}
            disabled={busy}
            key={action.key}
            onClick={() => (action.needsReason ? setPending(action) : void run(action))}
            size="small"
          >
            {action.label}
          </Button>
        ))}
      </div>
      {pending ? (
        <div className="te-confirm" role="dialog" aria-label={pending.label}>
          <p>{CONSEQUENCE[pending.key]}</p>
          <label className="te-label" htmlFor="te-status-reason">
            Reason (goes to the audit log)
          </label>
          <input
            autoFocus
            className="te-input"
            id="te-status-reason"
            onChange={(event) => setReason(event.target.value)}
            placeholder="For example: subscription unpaid for 30 days"
            value={reason}
          />
          {!reason.trim() ? (
            // The button stays off until there is a reason; say so (QA SA-31)
            <p className="te-muted te-small" role="status">
              Type a reason to {pending.label.toLowerCase()}.
            </p>
          ) : null}
          <div className="te-confirm__buttons">
            <Button
              buttonStyle="error"
              disabled={busy || !reason.trim()}
              onClick={() => void run(pending)}
              size="small"
            >
              {pending.label}
            </Button>
            <Button
              buttonStyle="secondary"
              disabled={busy}
              onClick={() => setPending(null)}
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

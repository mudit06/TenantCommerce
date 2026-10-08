'use client'

import { toast } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { callApi } from '@/admin/client/api'
import { Pill, type Tone } from '@/admin/ui'

export type ReturnView = {
  id: string
  status: string
  statusLabel: string
  at: string
  items: string
  value: string
  reason: string
  note: string | null
  photos: { url: string; alt: string }[]
  pickupNote: string | null
  rejectReason: string | null
}

const TONE: Record<string, Tone> = {
  requested: 'warning',
  approved: 'info',
  received: 'info',
  refunded: 'success',
  rejected: 'neutral',
}

/** One return on the order (docs/11 "Returns"): approve, reject, received, then Refund. */
export function ReturnsPanel({
  orderId,
  returns,
  canWrite,
}: {
  orderId: string
  returns: ReturnView[]
  canWrite: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  const act = async (id: string, body: Record<string, string>) => {
    setBusy(true)
    const result = await callApi(`/admin/v1/orders/${orderId}/returns/${id}`, { body })
    setBusy(false)
    if (!result.ok) {
      toast.error(result.error.message)
      return
    }
    toast.success('Saved')
    setOpen(null)
    setText('')
    router.refresh()
  }

  return (
    <div className="te-stack">
      {returns.map((r) => (
        <div className="te-stack" key={r.id}>
          <div className="te-inline-actions">
            <Pill tone={TONE[r.status] ?? 'neutral'}>{r.statusLabel}</Pill>
            <span className="te-muted te-small">
              {r.at} · {r.value}
            </span>
          </div>
          <p className="te-small">
            <b>{r.items}</b> · {r.reason}
          </p>
          {r.note ? <p className="te-small">“{r.note}”</p> : null}
          {r.photos.length ? (
            <div className="te-inline-actions">
              {r.photos.map((p) => (
                <a href={p.url} key={p.url} rel="noopener" target="_blank">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt={p.alt} className="te-thumb" src={p.url} />
                </a>
              ))}
            </div>
          ) : null}
          {r.pickupNote ? <p className="te-small">Pickup: {r.pickupNote}</p> : null}
          {r.rejectReason ? <p className="te-small">Rejected: {r.rejectReason}</p> : null}
          {canWrite && r.status === 'requested' && open?.id !== r.id ? (
            <div className="te-inline-actions">
              <button
                className="te-button te-button--primary te-button--small"
                onClick={() => {
                  setText('Our courier will pick it up within 2 working days. Keep it packed.')
                  setOpen({ id: r.id, action: 'approve' })
                }}
                type="button"
              >
                Approve
              </button>
              <button
                className="te-button te-button--secondary te-button--small"
                onClick={() => {
                  setText('')
                  setOpen({ id: r.id, action: 'reject' })
                }}
                type="button"
              >
                Reject
              </button>
            </div>
          ) : null}
          {open?.id === r.id ? (
            <div className="te-stack">
              <label className="te-label" htmlFor={`ret-${r.id}`}>
                {open.action === 'approve'
                  ? 'How the item comes back (sent to the shopper)'
                  : 'Why (sent to the shopper)'}
              </label>
              <textarea
                className="te-input"
                id={`ret-${r.id}`}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                value={text}
              />
              <div className="te-inline-actions">
                <button
                  className="te-button te-button--primary te-button--small"
                  disabled={busy || text.trim().length < 3}
                  onClick={() =>
                    act(
                      r.id,
                      open.action === 'approve'
                        ? { action: 'approve', pickupNote: text }
                        : { action: 'reject', reason: text },
                    )
                  }
                  type="button"
                >
                  {open.action === 'approve' ? 'Approve return' : 'Reject return'}
                </button>
                <button
                  className="te-button te-button--ghost te-button--small"
                  onClick={() => setOpen(null)}
                  type="button"
                >
                  Back
                </button>
              </div>
            </div>
          ) : null}
          {canWrite && r.status === 'approved' ? (
            <div>
              <button
                className="te-button te-button--secondary te-button--small"
                disabled={busy}
                onClick={() => act(r.id, { action: 'received' })}
                type="button"
              >
                Mark received
              </button>
            </div>
          ) : null}
          {r.status === 'received' ? (
            <p className="te-muted te-small">
              Received. Refund {r.value} with Refund above; the return closes when the refund goes
              through.
            </p>
          ) : null}
        </div>
      ))}
    </div>
  )
}

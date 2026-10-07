'use client'

import { toast } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { callApi } from '@/admin/client/api'
import { Empty, Pill, type Tone } from '@/admin/ui'

export type MessagePanelRow = {
  id: string
  direction: 'out' | 'in'
  channelLabel: string
  step: string
  at: string
  statusText: string
  tone: Tone
  text: string | null
  canResend: boolean
}

/**
 * "Messages to the shopper" on the order (docs/screens Order detail rule 6): every update sent
 * for this order with its outcome, shopper replies, and Resend for order roles.
 */
export function MessagesPanel({
  orderId,
  rows,
  canResend,
  footnote,
}: {
  orderId: string
  rows: MessagePanelRow[]
  canResend: boolean
  footnote: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  const resend = async (id: string) => {
    setBusy(id)
    const result = await callApi(`/admin/v1/orders/${orderId}/messages/${id}/resend`)
    setBusy(null)
    if (!result.ok) {
      toast.error(result.error.message)
      return
    }
    toast.success('Sending it again')
    router.refresh()
  }

  return (
    <div className="te-stack">
      {rows.length === 0 ? (
        <Empty>No messages yet.</Empty>
      ) : (
        <div className="te-messages">
          {rows.map((row) => (
            <div className="te-messages__row" key={row.id}>
              <div className="te-messages__what">
                <span className="te-strong">{row.step}</span>
                <span className="te-muted te-small">
                  {row.channelLabel} · {row.at}
                </span>
              </div>
              <Pill tone={row.tone}>{row.statusText}</Pill>
              {canResend && row.canResend ? (
                <button
                  className="te-button te-button--ghost te-button--small"
                  disabled={busy !== null}
                  onClick={() => resend(row.id)}
                  type="button"
                >
                  {busy === row.id ? 'Sending…' : 'Resend'}
                </button>
              ) : null}
              {row.text ? <p className="te-messages__reply">“{row.text}”</p> : null}
            </div>
          ))}
        </div>
      )}
      <p className="te-muted te-small">{footnote}</p>
    </div>
  )
}

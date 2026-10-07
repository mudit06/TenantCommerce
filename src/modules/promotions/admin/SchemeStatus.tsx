'use client'

import { toast, useDocumentInfo, useField, useFormFields, useFormModified } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { callApi } from '@/admin/client/api'
import { Pill, type Tone } from '@/admin/ui'

const LABEL: Record<string, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  live: 'Live',
  paused: 'Paused',
  ended: 'Ended',
}
const TONE: Record<string, Tone> = {
  live: 'success',
  scheduled: 'warning',
  draft: 'neutral',
  paused: 'info',
  ended: 'neutral',
}

const when = (iso: unknown) =>
  typeof iso === 'string' && iso
    ? new Date(iso).toLocaleString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Kolkata',
      })
    : ''

/**
 * The scheme's status in the editor's sidebar (docs/screens Scheme editor "Status"): Schedule
 * a draft, Pause, Resume or End now. Saves first need saving: the buttons wait for a clean form.
 */
export function SchemeStatus() {
  const router = useRouter()
  const { id } = useDocumentInfo()
  const { value: status } = useField<string>({ path: 'status' })
  const tenant = useFormFields(([fields]) => fields.tenant?.value) as unknown
  const startsAt = useFormFields(([fields]) => fields.startsAt?.value)
  const endsAt = useFormFields(([fields]) => fields.endsAt?.value)
  const modified = useFormModified()
  const [busy, setBusy] = useState(false)
  const storeId =
    typeof tenant === 'object' && tenant !== null
      ? String((tenant as { id: string }).id)
      : String(tenant ?? '')

  if (!id) {
    return (
      <div className="te-side-card">
        <p className="te-side-card__title">Status</p>
        <p className="te-muted te-small">Save the scheme as a draft first.</p>
      </div>
    )
  }

  const act = async (action: 'schedule' | 'pause' | 'resume' | 'end') => {
    if (action === 'end' && !window.confirm('End this scheme now? It can’t be started again.'))
      return
    setBusy(true)
    const result = await callApi<{ status: string }>(
      `/admin/v1/schemes/${id}/status?store=${storeId}`,
      { body: { action } },
    )
    setBusy(false)
    if (!result.ok) {
      toast.error(result.error.message)
      return
    }
    toast.success(`Now ${LABEL[result.data.status]?.toLowerCase()}`)
    router.refresh()
  }

  const line =
    status === 'scheduled'
      ? `goes live ${when(startsAt)}`
      : status === 'live'
        ? `ends ${when(endsAt)}`
        : status === 'draft'
          ? 'not on the store yet'
          : status === 'paused'
            ? 'not on the store while paused'
            : 'finished'

  return (
    <div className="te-side-card">
      <p className="te-side-card__title">Status</p>
      <div className="te-inline-actions">
        <Pill tone={TONE[status ?? 'draft'] ?? 'neutral'}>{LABEL[status ?? 'draft']}</Pill>
        <span className="te-muted te-small">{line}</span>
      </div>
      {modified ? <p className="te-muted te-small">Save your changes first.</p> : null}
      <div className="te-inline-actions">
        {status === 'draft' ? (
          <button
            className="te-button te-button--primary te-button--small"
            disabled={busy || modified}
            onClick={() => act('schedule')}
            type="button"
          >
            Schedule
          </button>
        ) : null}
        {status === 'paused' ? (
          <button
            className="te-button te-button--primary te-button--small"
            disabled={busy || modified}
            onClick={() => act('resume')}
            type="button"
          >
            Resume
          </button>
        ) : null}
        {status === 'live' || status === 'scheduled' ? (
          <button
            className="te-button te-button--secondary te-button--small"
            disabled={busy}
            onClick={() => act('pause')}
            type="button"
          >
            Pause
          </button>
        ) : null}
        {status === 'live' || status === 'scheduled' || status === 'paused' ? (
          <button
            className="te-button te-button--danger te-button--small"
            disabled={busy}
            onClick={() => act('end')}
            type="button"
          >
            End now
          </button>
        ) : null}
      </div>
    </div>
  )
}

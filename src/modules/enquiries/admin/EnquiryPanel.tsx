'use client'

import { toast } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Note = { id?: string | null; text: string; by?: string | null; at?: string | null }

/**
 * The open enquiry's working parts (docs/screens `cms-enquiries`): who it is assigned to, its
 * status and the team's internal notes, saved in place through the enquiries API (the same
 * access rules as the form).
 */
export function EnquiryPanel({
  id,
  assignedTo,
  status,
  staff,
  statuses,
  notes,
  canWrite,
}: {
  id: string
  assignedTo: string
  status: string
  staff: { value: string; label: string }[]
  statuses: { value: string; label: string }[]
  notes: Note[]
  canWrite: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  const save = async (data: Record<string, unknown>, done: string) => {
    setBusy(true)
    const response = await fetch(`/api/enquiries/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setBusy(false)
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        errors?: { message?: string }[]
      } | null
      toast.error(body?.errors?.[0]?.message ?? 'Couldn’t save. Try again.')
      return false
    }
    toast.success(done)
    router.refresh()
    return true
  }

  return (
    <div className="te-enquiry-panel">
      <div className="te-form-grid">
        <label className="te-field">
          <span className="te-label">Assigned to</span>
          <select
            className="te-input"
            disabled={!canWrite || busy}
            onChange={(event) =>
              void save({ assignedTo: event.target.value || null }, 'Assignment saved')
            }
            value={assignedTo}
          >
            <option value="">No one yet</option>
            {staff.map((person) => (
              <option key={person.value} value={person.value}>
                {person.label}
              </option>
            ))}
          </select>
        </label>
        <label className="te-field">
          <span className="te-label">Status</span>
          <select
            className="te-input"
            disabled={!canWrite || busy}
            onChange={(event) => void save({ status: event.target.value }, 'Status saved')}
            value={status}
          >
            {statuses.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="te-field">
        <label className="te-label" htmlFor="enquiry-note">
          Internal note
        </label>
        <textarea
          className="te-input"
          disabled={!canWrite || busy}
          id="enquiry-note"
          onChange={(event) => setNote(event.target.value)}
          placeholder="Only your team sees this"
          rows={3}
          value={note}
        />
        {canWrite && note.trim() ? (
          <button
            className="te-button te-button--secondary te-button--small"
            disabled={busy}
            onClick={async () => {
              const ok = await save(
                {
                  internalNotes: [
                    ...notes.map((n) => ({ id: n.id, text: n.text, by: n.by, at: n.at })),
                    { text: note.trim() },
                  ],
                },
                'Note added',
              )
              if (ok) setNote('')
            }}
            type="button"
          >
            Add note
          </button>
        ) : null}
      </div>
    </div>
  )
}

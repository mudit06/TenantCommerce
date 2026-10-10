'use client'

import { toast } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { ConfirmDialog } from '@/admin/ui/ConfirmDialog'

/** Alt text in the Media library's detail panel, saved without leaving the grid. */
export function MediaAltForm({
  id,
  alt,
  required,
  canWrite,
}: {
  id: string
  alt: string
  required: boolean
  canWrite: boolean
}) {
  const router = useRouter()
  const [value, setValue] = useState(alt)
  const [busy, setBusy] = useState(false)
  const save = async () => {
    if (required && !value.trim()) return toast.error('Alt text is required for images')
    setBusy(true)
    const response = await fetch(`/api/media/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alt: value.trim() }),
    })
    setBusy(false)
    if (response.ok) {
      toast.success('Alt text saved')
      router.refresh()
    } else toast.error('Couldn’t save the alt text. Try again.')
  }
  return (
    <div className="te-field">
      <label className="te-label" htmlFor="media-alt">
        Alt text {required ? <span className="te-required">*</span> : null}
      </label>
      <div className="te-inline-field">
        <input
          className="te-input"
          disabled={!canWrite || busy}
          id="media-alt"
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void save()
          }}
          placeholder="Aria basin mixer in matt black, side view"
          value={value}
        />
        {canWrite && value !== alt ? (
          <button
            className="te-button te-button--primary te-button--small"
            disabled={busy}
            onClick={() => void save()}
            type="button"
          >
            Save
          </button>
        ) : null}
      </div>
    </div>
  )
}

/** Delete from the detail panel: asks first, and Payload refuses a file still in use. */
export function MediaDeleteButton({ id, filename }: { id: string; filename: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const remove = async () => {
    setBusy(true)
    const response = await fetch(`/api/media/${id}`, { method: 'DELETE', credentials: 'include' })
    setBusy(false)
    setOpen(false)
    if (response.ok) {
      toast.success(`${filename} deleted`)
      router.replace('/admin/collections/media')
      router.refresh()
    } else {
      const body = (await response.json().catch(() => null)) as {
        errors?: { message?: string }[]
      } | null
      toast.error(body?.errors?.[0]?.message ?? 'Couldn’t delete this file.')
    }
  }
  return (
    <>
      <button
        className="te-button te-button--danger te-button--small"
        onClick={() => setOpen(true)}
        type="button"
      >
        Delete
      </button>
      <ConfirmDialog
        busy={busy}
        confirmLabel="Delete file"
        onClose={() => setOpen(false)}
        onConfirm={() => void remove()}
        open={open}
        title={`Delete ${filename}?`}
      >
        Pages and products that show it lose the picture. This can’t be undone.
      </ConfirmDialog>
    </>
  )
}

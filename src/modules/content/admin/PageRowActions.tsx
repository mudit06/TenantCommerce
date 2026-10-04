'use client'

import { Popup, PopupList, toast } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { adminUrl } from '@/admin/paths'
import { ConfirmDialog } from '@/admin/ui/ConfirmDialog'
import { Icon } from '@/admin/ui/icons'

async function rest(path: string, method: 'POST' | 'DELETE') {
  const response = await fetch(`/api/pages/${path}`, { method, credentials: 'include' })
  const json = (await response.json().catch(() => null)) as {
    doc?: { id?: string }
    errors?: { message?: string }[]
    message?: string
  } | null
  if (!response.ok) {
    throw new Error(
      json?.errors?.[0]?.message ??
        (response.status === 403
          ? 'You don’t have permission to change pages in this store.'
          : `The server couldn’t finish this (error ${response.status}). Try again in a moment.`),
    )
  }
  return json
}

/** Edit, view on the store, duplicate and delete (with a confirmation) for one page row. */
export function PageRowActions({
  id,
  title,
  editHref,
  storeHref,
  live,
  canDuplicate,
  canDelete,
}: {
  id: string
  title: string
  editHref: string
  storeHref?: string
  live: boolean
  canDuplicate: boolean
  canDelete: boolean
}) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  const duplicate = async () => {
    setBusy(true)
    try {
      const result = await rest(`${encodeURIComponent(id)}/duplicate`, 'POST')
      toast.success(`Copied “${title}” as a draft`)
      if (result?.doc?.id) router.push(adminUrl.page(result.doc.id))
      else router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The copy wasn’t made. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await rest(encodeURIComponent(id), 'DELETE')
      toast.success(`Deleted “${title}”`)
      setConfirming(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The page wasn’t deleted. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="te-row-actions">
      <a
        aria-label={`Edit ${title}`}
        className="te-icon-button"
        data-tooltip="Edit"
        href={editHref}
      >
        <Icon name="edit" size={16} />
      </a>
      <Popup
        button={
          <span aria-label={`More actions for ${title}`} className="te-icon-button" role="button">
            <svg aria-hidden fill="currentColor" height="16" viewBox="0 0 24 24" width="16">
              <circle cx="5" cy="12" r="1.8" />
              <circle cx="12" cy="12" r="1.8" />
              <circle cx="19" cy="12" r="1.8" />
            </svg>
          </span>
        }
        horizontalAlign="right"
        size="small"
      >
        <PopupList.ButtonGroup>
          <PopupList.Button href={editHref}>Edit</PopupList.Button>
          {storeHref && live ? (
            <PopupList.Button onClick={() => window.open(storeHref, '_blank', 'noopener')}>
              View on store
            </PopupList.Button>
          ) : null}
          {canDuplicate ? (
            <PopupList.Button disabled={busy} onClick={() => void duplicate()}>
              Duplicate
            </PopupList.Button>
          ) : null}
          {canDelete ? (
            <PopupList.Button
              className="te-popup-danger"
              disabled={busy}
              onClick={() => setConfirming(true)}
            >
              Delete
            </PopupList.Button>
          ) : null}
        </PopupList.ButtonGroup>
      </Popup>
      <ConfirmDialog
        busy={busy}
        confirmLabel="Delete page"
        onClose={() => setConfirming(false)}
        onConfirm={() => void remove()}
        open={confirming}
        title={`Delete “${title}”?`}
      >
        <p>
          The page, its drafts and all its saved versions are deleted.
          {live ? ' It disappears from the store now, and links to it stop working.' : ''} This
          can’t be undone.
        </p>
      </ConfirmDialog>
    </div>
  )
}

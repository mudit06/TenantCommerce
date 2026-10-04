'use client'

import { type ReactNode, useEffect, useRef } from 'react'

import { Icon } from './icons'

/**
 * A modal question before a destructive or high-impact action (delete, publish now). Native
 * <dialog>: focus stays inside, Escape and Cancel close it, Enter confirms.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  tone = 'danger',
  busy = false,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: ReactNode
  children?: ReactNode
  confirmLabel: string
  tone?: 'danger' | 'primary'
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])
  return (
    <dialog
      aria-labelledby="te-confirm-title"
      className="te-dialog"
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
      ref={ref}
    >
      <form
        method="dialog"
        onSubmit={(event) => {
          event.preventDefault()
          onConfirm()
        }}
      >
        <div className="te-dialog__body">
          <span aria-hidden className={`te-dialog__icon te-dialog__icon--${tone}`}>
            <Icon name={tone === 'danger' ? 'alert' : 'info'} size={20} />
          </span>
          <div>
            <h2 className="te-dialog__title" id="te-confirm-title">
              {title}
            </h2>
            {children ? <div className="te-dialog__text">{children}</div> : null}
          </div>
        </div>
        <div className="te-dialog__actions">
          <button
            className="te-button te-button--secondary te-button--medium"
            disabled={busy}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            autoFocus
            className={`te-button te-button--${tone} te-button--medium`}
            disabled={busy}
            type="submit"
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  )
}

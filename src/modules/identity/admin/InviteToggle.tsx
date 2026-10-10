'use client'

import { useState } from 'react'

import { InviteForm } from './InviteForm'

/** "Invite staff" above a staff table (wireframes `sa-vendor-staff`, `cms-staff`): opens the form. */
export function InviteToggle({
  tenantId,
  disabledReason,
}: {
  tenantId?: string
  disabledReason?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="te-invite-toggle">
      <button
        aria-expanded={open}
        className="te-button te-button--primary te-button--medium"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {open ? 'Close' : '+ Invite staff'}
      </button>
      {open ? (
        <div className="te-card te-invite-toggle__panel">
          <div className="te-card__body">
            <InviteForm disabledReason={disabledReason} tenantId={tenantId} />
          </div>
        </div>
      ) : null}
    </div>
  )
}

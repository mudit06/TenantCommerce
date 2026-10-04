'use client'

import { toast } from '@payloadcms/ui'
import { useState } from 'react'

import { callApi } from '@/admin/client/api'
import { ADMIN } from '@/admin/paths'

/** Ends the store session and returns to the platform panel (docs/05). */
export function EndStoreSessionButton() {
  const [busy, setBusy] = useState(false)
  const end = async () => {
    setBusy(true)
    const result = await callApi('/admin/v1/platform/store-session', { method: 'DELETE' })
    if (!result.ok) {
      setBusy(false)
      toast.error(result.error.message)
      return
    }
    // A full load: the menu, the screens and the selected store all change with the workspace
    window.location.assign(ADMIN)
  }
  return (
    <button
      className="te-session-banner__end"
      disabled={busy}
      onClick={() => void end()}
      type="button"
    >
      {busy ? 'Ending…' : 'End session'}
    </button>
  )
}

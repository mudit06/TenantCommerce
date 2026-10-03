'use client'

import { toast } from '@payloadcms/ui'
import { useState } from 'react'

import { callApi } from '@/admin/client/api'

export function ResendInviteButton({ userId }: { userId: string }) {
  const [busy, setBusy] = useState(false)
  const resend = async () => {
    setBusy(true)
    const result = await callApi(`/admin/v1/staff/invites/${userId}/resend`)
    setBusy(false)
    if (result.ok) toast.success('New invite sent. The old link no longer works.')
    else toast.error(result.error.message)
  }
  return (
    <button className="te-link-button" disabled={busy} onClick={() => void resend()} type="button">
      Resend invite
    </button>
  )
}

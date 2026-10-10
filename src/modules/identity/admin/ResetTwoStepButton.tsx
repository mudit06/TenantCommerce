'use client'

import { toast } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { callApi } from '@/admin/client/api'
import { ConfirmDialog } from '@/admin/ui/ConfirmDialog'

/** "Reset two-step" for someone who lost their phone (super admins; logged). */
export function ResetTwoStepButton({ userId, name }: { userId: string; name: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const reset = async () => {
    setBusy(true)
    const result = await callApi(`/admin/v1/staff/${userId}/two-step/reset`)
    setBusy(false)
    setOpen(false)
    if (result.ok) {
      toast.success(
        `Two-step sign-in reset for ${name}. They set it up again at their next sign-in.`,
      )
      router.refresh()
    } else toast.error(result.error.message)
  }
  return (
    <>
      <button
        className="te-link-button"
        disabled={busy}
        onClick={() => setOpen(true)}
        type="button"
      >
        Reset two-step
      </button>
      <ConfirmDialog
        busy={busy}
        confirmLabel="Reset two-step"
        onClose={() => setOpen(false)}
        onConfirm={() => void reset()}
        open={open}
        title={`Reset two-step sign-in for ${name}?`}
      >
        Their authenticator app stops working for this account. Only do this after checking it is
        really them, for example by calling the number you have on file. The reset is logged.
      </ConfirmDialog>
    </>
  )
}

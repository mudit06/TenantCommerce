'use client'

import { toast } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

/** The Shown switch on a dealer's row: on the store's dealer locator or not. */
export function ShownSwitch({
  id,
  name,
  shown,
  canWrite,
}: {
  id: string
  name: string
  shown: boolean
  canWrite: boolean
}) {
  const router = useRouter()
  const [on, setOn] = useState(shown)
  const [busy, setBusy] = useState(false)
  const flip = async () => {
    const next = !on
    setOn(next)
    setBusy(true)
    const response = await fetch(`/api/admin/v1/dealers/${id}/shown`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shown: next }),
    })
    setBusy(false)
    if (!response.ok) {
      setOn(!next)
      toast.error('Couldn’t change it. Try again.')
      return
    }
    router.refresh()
  }
  return (
    <label className="te-switch">
      <input
        aria-label={`Show ${name} on the store`}
        checked={on}
        disabled={!canWrite || busy}
        onChange={() => void flip()}
        role="switch"
        type="checkbox"
      />
      <span aria-hidden className="te-switch__track" />
    </label>
  )
}

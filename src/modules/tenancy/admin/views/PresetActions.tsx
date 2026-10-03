'use client'

import { Button, toast } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { callApi } from '@/admin/client/api'

/** "Re-apply preset" is deliberate: it overwrites the switches with the preset (docs/screens). */
export function PresetActions({ tenantId }: { tenantId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const apply = async () => {
    setBusy(true)
    const result = await callApi(`/admin/v1/platform/tenants/${tenantId}/features/apply-preset`)
    setBusy(false)
    setConfirming(false)
    if (!result.ok) return toast.error(result.error.message)
    toast.success('Preset re-applied')
    router.refresh()
  }
  if (!confirming) {
    return (
      <Button buttonStyle="secondary" onClick={() => setConfirming(true)} size="small">
        Re-apply preset
      </Button>
    )
  }
  return (
    <span className="te-inline-confirm">
      Reset every switch to the industry preset?{' '}
      <Button disabled={busy} onClick={() => void apply()} size="small">
        Re-apply
      </Button>{' '}
      <Button
        buttonStyle="secondary"
        disabled={busy}
        onClick={() => setConfirming(false)}
        size="small"
      >
        Cancel
      </Button>
    </span>
  )
}

'use client'

import { toast } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { callApi } from '@/admin/client/api'
import { Pill } from '@/admin/ui'

/** The Connectors tab's "Allowed" switch (docs/screens/super-admin.md `sa-vendor-connectors`). */
export function ConnectorAllowSwitch({
  tenantId,
  providerKey,
  label,
  allowed,
  inPlan,
  available,
  canEdit,
}: {
  tenantId: string
  providerKey: string
  label: string
  allowed: boolean
  inPlan: boolean
  available: boolean
  canEdit: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  if (!available) return <Pill>Comes later</Pill>
  if (!inPlan) return <Pill>Not in plan</Pill>
  const toggle = async (next: boolean) => {
    setBusy(true)
    const result = await callApi(
      `/admin/v1/platform/tenants/${tenantId}/connectors/${providerKey}`,
      {
        method: 'PATCH',
        body: { allowed: next },
      },
    )
    setBusy(false)
    if (!result.ok) {
      toast.error(result.error.message)
      return
    }
    toast.success(next ? `${label} allowed for this store` : `${label} switched off for this store`)
    router.refresh()
  }
  return (
    <label className="te-switch-row">
      <span className="te-switch">
        <input
          aria-label={`${label} allowed`}
          checked={allowed}
          disabled={!canEdit || busy}
          onChange={(event) => void toggle(event.target.checked)}
          type="checkbox"
        />
        <span className="te-switch__track" />
      </span>
      <span>Allowed</span>
    </label>
  )
}

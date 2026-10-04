'use client'

import { Button, toast, useDocumentInfo } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { callApi } from '@/admin/client/api'

/** Creates a variant for every combination of the ticked finishes and sizes. */
export function GenerateVariantsButton() {
  const { id } = useDocumentInfo()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  if (!id) return <p className="te-muted">Save the product, then create its variants here.</p>
  const run = async () => {
    setBusy(true)
    const result = await callApi<{ created: number; existing: number }>(
      `/admin/v1/catalog/products/${id}/variants/generate`,
    )
    setBusy(false)
    if (!result.ok) {
      toast.error(result.error.message)
      return
    }
    toast.success(
      result.data.created > 0
        ? `${result.data.created} variants created`
        : 'Every combination already has a variant',
    )
    router.refresh()
  }
  return (
    <div className="te-button-row" style={{ marginBottom: 16 }}>
      <Button buttonStyle="secondary" disabled={busy} onClick={() => void run()} size="small">
        Create variants for every combination
      </Button>
      <span className="te-muted te-small">
        Save the product first if you just ticked new options.
      </span>
    </div>
  )
}

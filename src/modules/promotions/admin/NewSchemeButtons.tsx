'use client'

import { toast } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { callApi } from '@/admin/client/api'
import { adminUrl } from '@/admin/paths'

/** "Start from an occasion" chips and "New scheme": a draft opens in the editor. */
export function NewSchemeButtons({
  storeId,
  occasions,
  variant,
}: {
  storeId: string
  occasions: { value: string; label: string }[]
  variant: 'chips' | 'button'
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const start = async (occasion: string) => {
    setBusy(occasion)
    const result = await callApi<{ id: string }>(`/admin/v1/schemes/new?store=${storeId}`, {
      body: { occasion },
    })
    if (!result.ok) {
      setBusy(null)
      toast.error(result.error.message)
      return
    }
    router.push(adminUrl.doc('schemes', result.data.id))
  }
  if (variant === 'button') {
    return (
      <button
        className="te-button te-button--primary te-button--small"
        disabled={busy !== null}
        onClick={() => start('custom')}
        type="button"
      >
        {busy ? 'Opening…' : '+ New scheme'}
      </button>
    )
  }
  return (
    <div className="te-chips">
      {occasions.map((o) => (
        <button
          className="te-chip te-chip--button"
          disabled={busy !== null}
          key={o.value}
          onClick={() => start(o.value)}
          type="button"
        >
          {busy === o.value ? 'Opening…' : o.label}
        </button>
      ))}
      <span className="te-chip te-chip--locked" title="Comes in Phase 2 with trade accounts">
        Dealer anniversary · P2
      </span>
    </div>
  )
}

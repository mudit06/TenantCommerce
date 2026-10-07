'use client'

import { Button, toast } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { callApi } from '@/admin/client/api'

/** "Submit to Meta" and "Sync templates" on the WhatsApp screen (owner, docs/18 onboarding 6) */
export function TemplateActions({
  storeId,
  canSubmit,
  connected,
}: {
  storeId: string
  canSubmit: boolean
  connected: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<'submit' | 'sync' | null>(null)

  const run = async (what: 'submit' | 'sync') => {
    setBusy(what)
    const result = await callApi<{
      submitted?: number
      updated?: number
      results?: { ok: boolean; message?: string }[]
    }>(`/admin/v1/notifications/templates/${what}`, { body: { store: storeId } })
    setBusy(null)
    if (!result.ok) {
      toast.error(result.error.message)
      return
    }
    if (what === 'submit') {
      const failed = (result.data.results ?? []).find((r) => !r.ok)
      if (failed) toast.error(`Meta refused one: ${failed.message ?? 'unknown reason'}`)
      else toast.success(`${result.data.submitted ?? 0} templates sent to Meta for approval`)
    } else {
      toast.success(`${result.data.updated ?? 0} templates updated from Meta`)
    }
    router.refresh()
  }

  return (
    <div className="te-inline-actions">
      <Button
        buttonStyle="primary"
        disabled={!connected || !canSubmit || busy !== null}
        onClick={() => run('submit')}
        size="small"
      >
        {busy === 'submit' ? 'Submitting…' : 'Submit to Meta'}
      </Button>
      <Button
        buttonStyle="secondary"
        disabled={!connected || busy !== null}
        onClick={() => run('sync')}
        size="small"
      >
        {busy === 'sync' ? 'Syncing…' : 'Sync templates'}
      </Button>
    </div>
  )
}

'use client'

import { Button, toast } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { callApi } from '@/admin/client/api'
import { RupeeField } from '@/admin/ui/RupeeField'
import type { CodRules } from '@/modules/content'

/** Cash on delivery card on Payments (docs/screens Payments, docs/09 "COD"). */
export function CodRulesForm({
  tenantId,
  rules,
  canEdit,
}: {
  tenantId: string
  rules: CodRules
  canEdit: boolean
}) {
  const router = useRouter()
  const [draft, setDraft] = useState<CodRules>(rules)
  const [invalid, setInvalid] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const amount =
    (key: 'codMinOrderMinor' | 'codMaxOrderMinor' | 'codFeeMinor') =>
    (value: number | null, valid: boolean) => {
      setDraft((current) => ({ ...current, [key]: value }))
      setInvalid((current) => {
        const next = new Set(current)
        if (valid) next.delete(key)
        else next.add(key)
        return next
      })
    }

  const save = async () => {
    setSaving(true)
    setErrors({})
    const result = await callApi('/admin/v1/payments/cod', { body: { tenantId, ...draft } })
    setSaving(false)
    if (!result.ok) {
      setErrors(result.error.fields ?? {})
      toast.error(result.error.message)
      return
    }
    toast.success('Cash on delivery rules saved')
    router.refresh()
  }

  return (
    <div className="te-form">
      <label className="te-switch-row">
        <span className="te-switch">
          <input
            checked={draft.codEnabled}
            disabled={!canEdit}
            onChange={(event) => setDraft({ ...draft, codEnabled: event.target.checked })}
            type="checkbox"
          />
          <span className="te-switch__track" />
        </span>
        <span>Offer cash on delivery</span>
      </label>
      <div className="te-form-grid">
        <RupeeField
          disabled={!canEdit || !draft.codEnabled}
          error={errors.codMinOrderMinor}
          id="cod-min"
          label="Min. order"
          onChange={amount('codMinOrderMinor')}
          valueMinor={draft.codMinOrderMinor}
        />
        <RupeeField
          disabled={!canEdit || !draft.codEnabled}
          error={errors.codMaxOrderMinor}
          id="cod-max"
          label="Max. order"
          onChange={amount('codMaxOrderMinor')}
          valueMinor={draft.codMaxOrderMinor}
        />
        <RupeeField
          disabled={!canEdit || !draft.codEnabled}
          error={errors.codFeeMinor}
          help="Added to the order total, taxed at the goods’ GST rate"
          id="cod-fee"
          label="COD fee"
          onChange={amount('codFeeMinor')}
          valueMinor={draft.codFeeMinor}
        />
      </div>
      <p className="te-field-help">Only offered in shipping zones that allow COD.</p>
      {canEdit ? (
        <Button disabled={saving || invalid.size > 0} onClick={() => void save()} size="small">
          {saving ? 'Saving…' : 'Save'}
        </Button>
      ) : null}
    </div>
  )
}

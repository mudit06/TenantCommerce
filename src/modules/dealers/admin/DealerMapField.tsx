'use client'

import { toast, useField, useFormFields } from '@payloadcms/ui'
import { useState } from 'react'

import { DealerMap } from '@/admin/ui/DealerMap'

const round = (n: number) => Math.round(n * 1e6) / 1e6

/**
 * The dealer's pin under its position (docs/screens `cms-dealers` rule 2): filled from the
 * pincode, then dragged or clicked onto the shop. Writes the `location` field ([longitude,
 * latitude]) like typing it would.
 */
export function DealerMapField() {
  const { value, setValue } = useField<[number, number] | null>({ path: 'location' })
  const pincode = useFormFields(([fields]) => fields.pincode?.value as string | undefined)
  const tenant = useFormFields(([fields]) => fields.tenant?.value as string | undefined)
  const name = useFormFields(([fields]) => fields.name?.value as string | undefined)
  const [busy, setBusy] = useState(false)
  const has =
    Array.isArray(value) && value.length === 2 && value.every((n) => typeof n === 'number')

  const fill = async () => {
    if (!pincode || !tenant) return toast.error('Enter the pincode first')
    setBusy(true)
    const response = await fetch(
      `/api/admin/v1/dealers/position?store=${encodeURIComponent(tenant)}&pincode=${encodeURIComponent(pincode)}`,
      { credentials: 'include' },
    )
    setBusy(false)
    const body = (await response.json().catch(() => null)) as {
      data?: { position: { latitude: number; longitude: number } | null }
    } | null
    const position = body?.data?.position
    if (!position) {
      return toast.error(
        'No position known for this pincode yet. Drag the pin or click the map at the shop.',
      )
    }
    setValue([round(position.longitude), round(position.latitude)])
  }

  return (
    <div className="te-dealer-map">
      <DealerMap
        draggable
        label={`Map position of ${name ?? 'this dealer'}`}
        onMove={(latitude, longitude) => setValue([round(longitude), round(latitude)])}
        points={
          has
            ? [{ id: 'this', name: name ?? 'Dealer', latitude: value![1], longitude: value![0] }]
            : []
        }
      />
      <div className="te-button-row">
        <button
          className="te-button te-button--secondary te-button--small"
          disabled={busy}
          onClick={() => void fill()}
          type="button"
        >
          {busy ? 'Finding…' : 'Fill from the pincode'}
        </button>
        <span className="te-muted te-small">
          {has
            ? 'Drag the pin onto the shop, or click the map where it is.'
            : 'Click the map at the shop, or fill it from the pincode.'}
        </span>
      </div>
    </div>
  )
}

'use client'

import { toast } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { callApi } from '@/admin/client/api'
import { Card, Empty, Pill, type Tone } from '@/admin/ui'

export type CartRow = {
  id: string
  shopper: string
  signedIn: boolean
  items: string
  value: string
  leftAt: string
  reminders: string
  result: string
  tone: Tone
}

type Channel = 'email' | 'whatsapp'

type Settings = {
  firstAfterMinutes: number
  secondAfterHours: number | null
  channels: Channel[]
  secondChannels: Channel[]
  secondCoupon: string | null
}

function ChannelChecks({
  id,
  value,
  onChange,
  disabled,
  whatsappOn,
}: {
  id: string
  value: Channel[]
  onChange: (next: Channel[]) => void
  disabled: boolean
  whatsappOn: boolean
}) {
  const toggle = (channel: Channel, on: boolean) =>
    onChange(on ? [...new Set([...value, channel])] : value.filter((c) => c !== channel))
  return (
    <div className="te-inline-actions">
      <label className="te-checkbox" htmlFor={`${id}-email`}>
        <input
          checked={value.includes('email')}
          disabled={disabled}
          id={`${id}-email`}
          onChange={(e) => toggle('email', e.target.checked)}
          type="checkbox"
        />
        Email
      </label>
      <label className="te-checkbox" htmlFor={`${id}-wa`}>
        <input
          checked={whatsappOn && value.includes('whatsapp')}
          disabled={disabled || !whatsappOn}
          id={`${id}-wa`}
          onChange={(e) => toggle('whatsapp', e.target.checked)}
          type="checkbox"
        />
        WhatsApp{whatsappOn ? '' : ' (off: switched on by the platform)'}
      </label>
    </div>
  )
}

/** The carts table and the reminder settings (docs/screens Abandoned carts). */
export function AbandonedCartsClient({
  canWrite,
  coupons,
  rows,
  settings,
  storeId,
  whatsappOn,
}: {
  canWrite: boolean
  coupons: { code: string; label: string }[]
  rows: CartRow[]
  settings: Settings
  storeId: string
  whatsappOn: boolean
}) {
  const router = useRouter()
  const [config, setConfig] = useState(settings)
  const [busy, setBusy] = useState(false)
  const secondOn = config.secondAfterHours !== null

  const save = async () => {
    setBusy(true)
    const result = await callApi(`/admin/v1/carts/settings?store=${storeId}`, { body: config })
    setBusy(false)
    if (!result.ok) toast.error(result.error.message)
    else toast.success('Reminders saved')
    router.refresh()
  }

  return (
    <div className="te-coupon-layout">
      <div className="te-stack">
        {rows.length ? (
          <div className="te-card te-card--table">
            <div className="te-table-scroll">
              <table className="te-table te-table--rows">
                <thead>
                  <tr>
                    <th>Shopper</th>
                    <th>Items</th>
                    <th className="te-num">Value</th>
                    <th>Left at</th>
                    <th>Reminders</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className="te-nowrap">
                        {row.shopper}
                        {row.signedIn ? <div className="te-muted te-small">Signed in</div> : null}
                      </td>
                      <td>{row.items}</td>
                      <td className="te-num te-nowrap">{row.value}</td>
                      <td className="te-nowrap">{row.leftAt}</td>
                      <td className="te-small">{row.reminders}</td>
                      <td>
                        {row.result === '—' ? (
                          <span className="te-muted">—</span>
                        ) : (
                          <Pill tone={row.tone}>{row.result}</Pill>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <Empty>
            No carts left in the last 7 days. A cart shows here once it has items, a contact and
            nothing happened for the first-reminder delay.
          </Empty>
        )}
      </div>

      <Card title="Reminders">
        <div className="te-stack">
          <div>
            <label className="te-label" htmlFor="ac-first">
              First reminder after (minutes)
            </label>
            <input
              className="te-input"
              disabled={!canWrite}
              id="ac-first"
              max={24 * 60}
              min={15}
              onChange={(e) =>
                setConfig({ ...config, firstAfterMinutes: Number(e.target.value) || 15 })
              }
              type="number"
              value={config.firstAfterMinutes}
            />
            <ChannelChecks
              disabled={!canWrite}
              id="ac-first-ch"
              onChange={(channels) => setConfig({ ...config, channels })}
              value={config.channels}
              whatsappOn={whatsappOn}
            />
          </div>
          <div>
            <label className="te-checkbox" htmlFor="ac-second-on">
              <input
                checked={secondOn}
                disabled={!canWrite}
                id="ac-second-on"
                onChange={(e) =>
                  setConfig({ ...config, secondAfterHours: e.target.checked ? 24 : null })
                }
                type="checkbox"
              />
              Send a second reminder
            </label>
            {secondOn ? (
              <>
                <label className="te-label" htmlFor="ac-second">
                  Second reminder after (hours)
                </label>
                <input
                  className="te-input"
                  disabled={!canWrite}
                  id="ac-second"
                  max={7 * 24}
                  min={2}
                  onChange={(e) =>
                    setConfig({ ...config, secondAfterHours: Number(e.target.value) || 2 })
                  }
                  type="number"
                  value={config.secondAfterHours ?? 24}
                />
                <ChannelChecks
                  disabled={!canWrite}
                  id="ac-second-ch"
                  onChange={(secondChannels) => setConfig({ ...config, secondChannels })}
                  value={config.secondChannels}
                  whatsappOn={whatsappOn}
                />
                <label className="te-label" htmlFor="ac-code">
                  Code in the second reminder
                </label>
                <select
                  className="te-input"
                  disabled={!canWrite}
                  id="ac-code"
                  onChange={(e) => setConfig({ ...config, secondCoupon: e.target.value || null })}
                  value={config.secondCoupon ?? ''}
                >
                  <option value="">No code</option>
                  {coupons.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </>
            ) : null}
          </div>
          <p className="te-muted te-small">
            Only shoppers who agreed to offers on that channel, one series a week, inside the offer
            send window. Restore links last 7 days.
          </p>
          {canWrite ? (
            <div>
              <button
                className="te-button te-button--primary te-button--small"
                disabled={busy}
                onClick={save}
                type="button"
              >
                Save reminders
              </button>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  )
}

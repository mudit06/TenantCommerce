'use client'

import { toast } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { callApi } from '@/admin/client/api'
import { Card, Empty, Pill } from '@/admin/ui'

export type CampaignValues = {
  title: string
  scheme: string
  subject: string
  headline: string
  detail: string
  buttonLabel: string
  linkPath: string
  audience: 'all' | 'wishlist' | 'lapsed'
  channels: ('email' | 'whatsapp')[]
  sendAt: string
}

export type CampaignRow = {
  id: string
  title: string
  sub: string
  channels: string
  send: string
  status: string
  statusLabel: string
  sent: string
  orders: string
  sales: string
  values: CampaignValues
}

export type SchemeOption = {
  id: string
  name: string
  headline: string
  detail: string
  linkPath: string
  startsAt: string
}

const toLocal = (iso: string) =>
  new Date(new Date(iso).getTime() + 330 * 60_000).toISOString().slice(0, 16)
const fromLocal = (value: string) =>
  new Date(new Date(`${value}:00Z`).getTime() - 330 * 60_000).toISOString()

const blank = (): CampaignValues => ({
  title: '',
  scheme: '',
  subject: '',
  headline: '',
  detail: '',
  buttonLabel: 'Shop the offer',
  linkPath: 'offers',
  audience: 'all',
  channels: ['email'],
  sendAt: new Date(Date.now() + 3_600_000).toISOString(),
})

const TONE: Record<string, 'success' | 'warning' | 'neutral' | 'info'> = {
  sent: 'success',
  scheduled: 'warning',
  sending: 'info',
  draft: 'neutral',
  cancelled: 'neutral',
}

export function OfferMessagesClient({
  rows,
  schemes,
  storeId,
  storeName,
  canWrite,
  canSettings,
  settings,
  stats,
  whatsapp,
}: {
  rows: CampaignRow[]
  schemes: SchemeOption[]
  storeId: string
  storeName: string
  canWrite: boolean
  canSettings: boolean
  settings: { maxPerShopperPerWeek: number; cap: number; windowStart: string; windowEnd: string }
  stats: { email: number; whatsapp: number; unsubscribed: number }
  whatsapp: { on: boolean; template: string }
}) {
  const router = useRouter()
  const [editing, setEditing] = useState<{
    id: string | null
    status: string
    values: CampaignValues
  } | null>(null)
  const [count, setCount] = useState<{ email: number; whatsapp: number; capped: number } | null>(
    null,
  )
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [config, setConfig] = useState(settings)
  const v = editing?.values

  const set = <K extends keyof CampaignValues>(key: K, value: CampaignValues[K]) =>
    setEditing((e) => (e ? { ...e, values: { ...e.values, [key]: value } } : e))

  useEffect(() => {
    if (!v) return
    let gone = false
    const timer = window.setTimeout(async () => {
      const result = await callApi<{ email: number; whatsapp: number; capped: number }>(
        `/admin/v1/offer-campaigns/audience?store=${storeId}`,
        { body: { channels: v.channels, audience: v.audience, scheme: v.scheme || null } },
      )
      if (!gone && result.ok) setCount(result.data)
    }, 300)
    return () => {
      gone = true
      window.clearTimeout(timer)
    }
  }, [v?.channels.join(','), v?.audience, v?.scheme, storeId]) // eslint-disable-line react-hooks/exhaustive-deps

  const pickScheme = (id: string) => {
    const scheme = schemes.find((s) => s.id === id)
    setEditing((e) =>
      e
        ? {
            ...e,
            values: {
              ...e.values,
              scheme: id,
              ...(scheme
                ? {
                    title: e.values.title || `${scheme.name} starts today`,
                    subject: e.values.subject || `${scheme.name}: ${scheme.headline}`,
                    headline: `our ${scheme.name} is on: ${scheme.headline}`,
                    detail: scheme.detail,
                    linkPath: scheme.linkPath,
                    sendAt: new Date(
                      Math.max(Date.now(), new Date(scheme.startsAt).getTime()),
                    ).toISOString(),
                  }
                : {}),
            },
          }
        : e,
    )
  }

  const save = async (then?: 'schedule' | 'test') => {
    if (!editing || !v) return
    setBusy(true)
    setErrors({})
    const result = await callApi<{ id: string }>(
      editing.id
        ? `/admin/v1/offer-campaigns/${editing.id}?store=${storeId}`
        : `/admin/v1/offer-campaigns?store=${storeId}`,
      { body: { ...v, scheme: v.scheme || null, detail: v.detail || undefined } },
    )
    if (!result.ok) {
      setBusy(false)
      setErrors(result.error.fields ?? {})
      toast.error(result.error.message)
      return
    }
    const id = result.data.id
    if (then) {
      const next = await callApi<{ status: string; sendAt: string; to: string }>(
        `/admin/v1/offer-campaigns/${id}/${then === 'schedule' ? 'status' : 'test'}?store=${storeId}`,
        { body: then === 'schedule' ? { action: 'schedule' } : {} },
      )
      setBusy(false)
      if (!next.ok) {
        toast.error(next.error.message)
        setEditing({ ...editing, id })
        router.refresh()
        return
      }
      toast.success(then === 'schedule' ? 'Scheduled' : `Test sent to ${next.data.to}`)
      if (then === 'test') {
        setEditing({ ...editing, id })
        router.refresh()
        return
      }
    } else {
      setBusy(false)
      toast.success('Saved as a draft')
    }
    setEditing(null)
    router.refresh()
  }

  const cancel = async (id: string) => {
    setBusy(true)
    const result = await callApi(`/admin/v1/offer-campaigns/${id}/status?store=${storeId}`, {
      body: { action: 'cancel' },
    })
    setBusy(false)
    if (!result.ok) toast.error(result.error.message)
    setEditing(null)
    router.refresh()
  }

  const saveSettings = async () => {
    setBusy(true)
    const result = await callApi(`/admin/v1/offer-campaigns/settings?store=${storeId}`, {
      body: {
        maxPerShopperPerWeek: config.maxPerShopperPerWeek,
        sendWindow: { start: config.windowStart, end: config.windowEnd },
      },
    })
    setBusy(false)
    if (!result.ok) toast.error(result.error.message)
    else toast.success('Settings saved')
    router.refresh()
  }

  const editable = !editing || editing.status === 'draft' || editing.status === 'scheduled'
  const preview = v
    ? `Hi Rahul, ${v.headline || 'your offer in one line'}.${v.detail ? `\n${v.detail}` : ''}`
    : ''
  const err = (key: string) =>
    errors[key] ? <p className="te-field-error">{errors[key]}</p> : null

  return (
    <div className="te-coupon-layout">
      <div className="te-stack">
        {canWrite ? (
          <div>
            <button
              className="te-button te-button--primary te-button--small"
              onClick={() => {
                setErrors({})
                setEditing({ id: null, status: 'draft', values: blank() })
              }}
              type="button"
            >
              + New message
            </button>
          </div>
        ) : null}
        {rows.length ? (
          <div className="te-card te-card--table">
            <div className="te-table-scroll">
              <table className="te-table te-table--rows">
                <thead>
                  <tr>
                    <th>Message</th>
                    <th>Channels</th>
                    <th>Send</th>
                    <th>Status</th>
                    <th className="te-num">Sent</th>
                    <th className="te-num">Orders</th>
                    <th className="te-num">Sales</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <button
                          className="te-link-button te-strong"
                          onClick={() => {
                            setErrors({})
                            setEditing({ id: row.id, status: row.status, values: row.values })
                          }}
                          type="button"
                        >
                          {row.title}
                        </button>
                        <div className="te-muted te-small">{row.sub}</div>
                      </td>
                      <td>{row.channels}</td>
                      <td className="te-nowrap">{row.send}</td>
                      <td>
                        <Pill tone={TONE[row.status] ?? 'neutral'}>{row.statusLabel}</Pill>
                      </td>
                      <td className="te-num">{row.sent}</td>
                      <td className="te-num">{row.orders}</td>
                      <td className="te-num te-nowrap">{row.sales}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <Empty>
            No offer messages yet. A scheme can also send one when it starts (“Tell shoppers”).
          </Empty>
        )}

        {editing && v ? (
          <Card title={editing.id ? v.title || 'Offer message' : 'New offer message'}>
            <div className="te-form">
              <div className="te-form-grid">
                <div>
                  <label className="te-label" htmlFor="oc-scheme">
                    Scheme
                  </label>
                  <select
                    className="te-input"
                    disabled={!editable}
                    id="oc-scheme"
                    onChange={(e) => pickScheme(e.target.value)}
                    value={v.scheme}
                  >
                    <option value="">None (a general offer)</option>
                    {schemes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="te-label" htmlFor="oc-send">
                    Send at
                  </label>
                  <input
                    className="te-input"
                    disabled={!editable}
                    id="oc-send"
                    onChange={(e) => e.target.value && set('sendAt', fromLocal(e.target.value))}
                    type="datetime-local"
                    value={toLocal(v.sendAt)}
                  />
                  <p className="te-field-help">
                    Inside your window, {config.windowStart} to {config.windowEnd}
                  </p>
                </div>
                <div className="te-form-grid__wide">
                  <label className="te-label" htmlFor="oc-title">
                    Name
                  </label>
                  <input
                    className="te-input"
                    disabled={!editable}
                    id="oc-title"
                    onChange={(e) => set('title', e.target.value)}
                    value={v.title}
                  />
                  {err('title')}
                </div>
                <div className="te-form-grid__wide">
                  <label className="te-label" htmlFor="oc-subject">
                    Email subject
                  </label>
                  <input
                    className="te-input"
                    disabled={!editable}
                    id="oc-subject"
                    onChange={(e) => set('subject', e.target.value)}
                    value={v.subject}
                  />
                  {err('subject')}
                </div>
                <div className="te-form-grid__wide">
                  <label className="te-label" htmlFor="oc-headline">
                    The offer, after “Hi Rahul,”
                  </label>
                  <input
                    className="te-input"
                    disabled={!editable}
                    id="oc-headline"
                    onChange={(e) => set('headline', e.target.value)}
                    placeholder="our Diwali offer is on: 10% off all faucets and showers"
                    value={v.headline}
                  />
                  {err('headline')}
                </div>
                <div>
                  <label className="te-label" htmlFor="oc-detail">
                    Second line
                  </label>
                  <input
                    className="te-input"
                    disabled={!editable}
                    id="oc-detail"
                    onChange={(e) => set('detail', e.target.value)}
                    placeholder="Ends Mon, 9 Nov."
                    value={v.detail}
                  />
                </div>
                <div>
                  <label className="te-label" htmlFor="oc-link">
                    Button opens
                  </label>
                  <input
                    className="te-input te-mono"
                    disabled={!editable}
                    id="oc-link"
                    onChange={(e) => set('linkPath', e.target.value)}
                    value={v.linkPath}
                  />
                  {err('linkPath')}
                </div>
              </div>
              <fieldset className="te-fieldset">
                <legend className="te-label">Who</legend>
                {(
                  [
                    ['all', 'Everyone who agreed to offers'],
                    [
                      'wishlist',
                      v.scheme ? 'Wishlisted products in this scheme' : 'Anyone with a wishlist',
                    ],
                    ['lapsed', 'No order in the last 90 days'],
                  ] as const
                ).map(([value, label]) => (
                  <label className="te-checkbox" key={value}>
                    <input
                      checked={v.audience === value}
                      disabled={!editable}
                      name="oc-audience"
                      onChange={() => set('audience', value)}
                      type="radio"
                    />
                    {label}
                  </label>
                ))}
              </fieldset>
              <fieldset className="te-fieldset">
                <legend className="te-label">Channels</legend>
                <label className="te-checkbox">
                  <input
                    checked={v.channels.includes('email')}
                    disabled={!editable}
                    onChange={(e) =>
                      set(
                        'channels',
                        e.target.checked
                          ? [...new Set([...v.channels, 'email' as const])]
                          : v.channels.filter((c) => c !== 'email'),
                      )
                    }
                    type="checkbox"
                  />
                  Email · subject “{v.subject || '…'}”
                </label>
                {whatsapp.on ? (
                  <label className="te-checkbox">
                    <input
                      checked={v.channels.includes('whatsapp')}
                      disabled={!editable}
                      onChange={(e) =>
                        set(
                          'channels',
                          e.target.checked
                            ? [...new Set([...v.channels, 'whatsapp' as const])]
                            : v.channels.filter((c) => c !== 'whatsapp'),
                        )
                      }
                      type="checkbox"
                    />
                    WhatsApp · template {whatsapp.template}
                  </label>
                ) : (
                  <p className="te-muted te-small">
                    WhatsApp offers are off for this store: your platform team switches them on.
                  </p>
                )}
                {err('channels')}
              </fieldset>
              {count ? (
                <div className="te-notice te-notice--info">
                  <b>
                    {count.email.toLocaleString('en-IN')} by email
                    {whatsapp.on
                      ? ` and ${count.whatsapp.toLocaleString('en-IN')} on WhatsApp`
                      : ''}
                  </b>{' '}
                  after unsubscribes, bounces and the {config.maxPerShopperPerWeek}-a-week cap
                  {count.capped ? ` (${count.capped} left out by the cap)` : ''}.
                  {whatsapp.on && count.whatsapp
                    ? ` WhatsApp: about ₹${Math.round(count.whatsapp * 1.02).toLocaleString('en-IN')} on your Meta bill.`
                    : ''}
                </div>
              ) : null}
              {canWrite && editable ? (
                <div className="te-inline-actions">
                  <button
                    className="te-button te-button--secondary te-button--small"
                    disabled={busy}
                    onClick={() => save('test')}
                    type="button"
                  >
                    Send test to me
                  </button>
                  <button
                    className="te-button te-button--secondary te-button--small"
                    disabled={busy}
                    onClick={() => save()}
                    type="button"
                  >
                    Save draft
                  </button>
                  <button
                    className="te-button te-button--primary te-button--small"
                    disabled={busy}
                    onClick={() => save('schedule')}
                    type="button"
                  >
                    Schedule
                  </button>
                  {editing.id ? (
                    <button
                      className="te-button te-button--ghost te-button--small"
                      disabled={busy}
                      onClick={() => cancel(editing.id!)}
                      type="button"
                    >
                      Cancel message
                    </button>
                  ) : null}
                </div>
              ) : (
                <p className="te-muted te-small">This message has gone out; it can’t change.</p>
              )}
            </div>
          </Card>
        ) : null}
      </div>

      <div className="te-stack">
        {v ? (
          <Card title="Preview">
            <div className="te-wa">
              <p className="te-wa__from">
                <b>{storeName}</b> · Business account
              </p>
              <div className="te-wa__bubble">{preview}</div>
              <div className="te-wa__button">{v.buttonLabel || 'Shop the offer'}</div>
              {whatsapp.on ? <div className="te-wa__button">Stop offers</div> : null}
            </div>
            <p className="te-muted te-small">
              The email says the same, with the button and a one-tap unsubscribe link.
            </p>
          </Card>
        ) : null}
        <Card title="Settings">
          <div className="te-stack">
            <div className="te-form-grid">
              <div>
                <label className="te-label" htmlFor="oc-ws">
                  Send window from
                </label>
                <input
                  className="te-input"
                  disabled={!canSettings}
                  id="oc-ws"
                  onChange={(e) => setConfig({ ...config, windowStart: e.target.value })}
                  type="time"
                  value={config.windowStart}
                />
              </div>
              <div>
                <label className="te-label" htmlFor="oc-we">
                  to
                </label>
                <input
                  className="te-input"
                  disabled={!canSettings}
                  id="oc-we"
                  onChange={(e) => setConfig({ ...config, windowEnd: e.target.value })}
                  type="time"
                  value={config.windowEnd}
                />
              </div>
              <div className="te-form-grid__wide">
                <label className="te-label" htmlFor="oc-cap">
                  Offer messages per shopper, a week
                </label>
                <input
                  className="te-input"
                  disabled={!canSettings}
                  id="oc-cap"
                  max={config.cap}
                  min={1}
                  onChange={(e) =>
                    setConfig({ ...config, maxPerShopperPerWeek: Number(e.target.value) || 1 })
                  }
                  type="number"
                  value={config.maxPerShopperPerWeek}
                />
                <p className="te-field-help">Platform limit: {config.cap}</p>
              </div>
            </div>
            <p className="te-small">
              WhatsApp offers: <b>{whatsapp.on ? 'On, set by your platform team' : 'Off'}</b>
            </p>
            <dl className="te-dl">
              <dt>Opted in by email</dt>
              <dd>{stats.email.toLocaleString('en-IN')}</dd>
              <dt>Opted in on WhatsApp</dt>
              <dd>{stats.whatsapp.toLocaleString('en-IN')}</dd>
              <dt>Unsubscribed this month</dt>
              <dd>{stats.unsubscribed.toLocaleString('en-IN')}</dd>
            </dl>
            {canSettings ? (
              <div>
                <button
                  className="te-button te-button--primary te-button--small"
                  disabled={busy}
                  onClick={saveSettings}
                  type="button"
                >
                  Save settings
                </button>
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  )
}

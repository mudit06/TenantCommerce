'use client'

import { Button, toast } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import { callApi } from '@/admin/client/api'
import { Card, PageHeader, Pill, type Tone } from '@/admin/ui'

type Mode = 'on' | 'off'

export type StepRow = {
  key: string
  label: string
  description: string
  later: boolean
  email: Mode
  whatsapp: Mode
  template: { status: string; label: string; reason: string | null } | null
}

export type PreviewItem = {
  id: string
  label: string
  milestone: string
  variant: string
  channel: 'email' | 'whatsapp'
  text: string
  subject?: string
  button: string | null
}

type Values = {
  milestones: { key: string; email: Mode; whatsapp: Mode }[]
  packedDelayMinutes: number
  quietHours: { enabled: boolean; start: string; end: string }
  whatsappOptInDefault: boolean
  staffAlertEmails: string[]
}

const TEMPLATE_TONE: Record<string, Tone> = {
  approved: 'success',
  submitted: 'warning',
  rejected: 'danger',
  paused: 'danger',
  disabled: 'neutral',
  draft: 'neutral',
}

const QUALITY: Record<string, { tone: Tone; label: string }> = {
  green: { tone: 'success', label: 'Quality high' },
  high: { tone: 'success', label: 'Quality high' },
  yellow: { tone: 'warning', label: 'Quality medium' },
  medium: { tone: 'warning', label: 'Quality medium' },
  red: { tone: 'danger', label: 'Quality low' },
  low: { tone: 'danger', label: 'Quality low' },
}

function Switch({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="te-switch" title={label}>
      <input
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span className="te-switch__track" />
    </label>
  )
}

/**
 * Order updates (docs/screens/vendor-cms.md `cms-notifications`): which channel each step goes
 * out on, the template's status, a preview with a sample order, a test send, timing and limits.
 */
export function OrderUpdatesForm({
  storeId,
  canEdit,
  steps,
  initial,
  previews,
  channels,
  costLine,
  perRecipientPerDay,
  messagingHref,
  testEmail,
}: {
  storeId: string
  canEdit: boolean
  steps: StepRow[]
  initial: Values
  previews: PreviewItem[]
  channels: {
    whatsapp: { ready: boolean; line: string; quality: string | null }
    email: { line: string }
  }
  costLine: string
  perRecipientPerDay: number
  messagingHref: string
  testEmail: string
}) {
  const router = useRouter()
  const [values, setValues] = useState<Values>(initial)
  const [alerts, setAlerts] = useState(initial.staffAlertEmails.join(', '))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [previewId, setPreviewId] = useState(
    previews.find((p) => p.milestone === 'shipment_shipped' && p.channel === 'whatsapp')?.id ??
      previews[0]?.id,
  )
  const preview = previews.find((p) => p.id === previewId) ?? previews[0]
  const [testTo, setTestTo] = useState('')
  const [testing, setTesting] = useState(false)
  const quality = channels.whatsapp.quality ? QUALITY[channels.whatsapp.quality] : undefined

  const modeOf = (key: string, channel: 'email' | 'whatsapp') =>
    values.milestones.find((row) => row.key === key)?.[channel] ?? 'off'
  const setMode = (key: string, channel: 'email' | 'whatsapp', on: boolean) =>
    setValues((current) => ({
      ...current,
      milestones: current.milestones.map((row) =>
        row.key === key ? { ...row, [channel]: on ? 'on' : 'off' } : row,
      ),
    }))

  const dirty = useMemo(
    () =>
      JSON.stringify({ ...values, staffAlertEmails: undefined }) !==
        JSON.stringify({ ...initial, staffAlertEmails: undefined }) ||
      alerts !== initial.staffAlertEmails.join(', '),
    [values, initial, alerts],
  )

  const save = async () => {
    setBusy(true)
    setErrors({})
    const staffAlertEmails = alerts
      .split(/[,\s]+/)
      .map((email) => email.trim())
      .filter(Boolean)
    const result = await callApi('/admin/v1/notifications/settings', {
      body: { store: storeId, ...values, staffAlertEmails },
    })
    setBusy(false)
    if (!result.ok) {
      setErrors(result.error.fields ?? {})
      toast.error(result.error.message)
      return
    }
    toast.success('Order updates saved')
    router.refresh()
  }

  const sendTest = async () => {
    if (!preview) return
    setTesting(true)
    const to = testTo || (preview.channel === 'email' ? testEmail : '')
    const result = await callApi<{ outcome: string; message: string }>(
      '/admin/v1/notifications/test',
      {
        body: {
          store: storeId,
          milestone: preview.milestone,
          variant: preview.variant,
          channel: preview.channel,
          to,
        },
      },
    )
    setTesting(false)
    if (!result.ok) {
      toast.error(result.error.fields?.to ?? result.error.message)
      return
    }
    if (result.data.outcome === 'sent') toast.success(result.data.message)
    else toast.error(result.data.message)
  }

  const field = (key: string) =>
    errors[key] ? <p className="te-field-error">{errors[key]}</p> : null

  return (
    <div className="te-page">
      <PageHeader
        actions={
          canEdit ? (
            <Button buttonStyle="primary" disabled={busy || !dirty} onClick={save} size="medium">
              {busy ? 'Saving…' : 'Save'}
            </Button>
          ) : null
        }
        eyebrow="Store"
        subtitle="Sent from your own WhatsApp number and in your store’s name by email"
        title="Order updates"
      />

      <div className="te-grid te-grid--thirds">
        <a className="te-card te-channel" href={messagingHref}>
          <div className="te-channel__head">
            <strong>WhatsApp</strong>
            {channels.whatsapp.ready ? (
              quality ? (
                <Pill tone={quality.tone}>{quality.label}</Pill>
              ) : (
                <Pill tone="success">Connected</Pill>
              )
            ) : (
              <Pill tone="warning">Not connected</Pill>
            )}
          </div>
          <span className="te-muted te-small">{channels.whatsapp.line}</span>
        </a>
        <div className="te-card te-channel">
          <div className="te-channel__head">
            <strong>SMS</strong>
            <Pill>Comes later</Pill>
          </div>
          <span className="te-muted te-small">
            Until then shoppers without WhatsApp get their updates by email.
          </span>
        </div>
        <div className="te-card te-channel">
          <div className="te-channel__head">
            <strong>Email</strong>
            <Pill tone="success">Ready</Pill>
          </div>
          <span className="te-muted te-small">{channels.email.line}</span>
        </div>
      </div>

      <div className="te-grid te-grid--2-1">
        <div className="te-stack">
          <Card className="te-card--table" title="Steps and channels">
            <div className="te-table-scroll">
              <table className="te-table">
                <thead>
                  <tr>
                    <th>Step</th>
                    <th>Email</th>
                    <th>WhatsApp</th>
                    <th>Template</th>
                  </tr>
                </thead>
                <tbody>
                  {steps.map((step) => (
                    <tr key={step.key}>
                      <td>
                        <span className="te-strong">{step.label}</span>
                        <span className="te-muted te-small te-block">
                          {step.later ? 'Comes with returns' : step.description}
                        </span>
                      </td>
                      <td>
                        {step.later ? (
                          <span className="te-muted">—</span>
                        ) : (
                          <Switch
                            checked={modeOf(step.key, 'email') === 'on'}
                            disabled={!canEdit || step.later || busy}
                            label={`${step.label} by email`}
                            onChange={(on) => setMode(step.key, 'email', on)}
                          />
                        )}
                      </td>
                      <td>
                        {step.later ? (
                          <span className="te-muted">—</span>
                        ) : (
                          <Switch
                            checked={modeOf(step.key, 'whatsapp') === 'on'}
                            disabled={!canEdit || step.later || busy}
                            label={`${step.label} on WhatsApp`}
                            onChange={(on) => setMode(step.key, 'whatsapp', on)}
                          />
                        )}
                      </td>
                      <td>
                        {step.template ? (
                          <>
                            <Pill tone={TEMPLATE_TONE[step.template.status] ?? 'neutral'}>
                              {step.template.label}
                            </Pill>
                            {step.template.reason ? (
                              <span className="te-muted te-small te-block">
                                {step.template.reason}
                              </span>
                            ) : null}
                          </>
                        ) : (
                          <span className="te-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <div className="te-notice te-notice--info" role="status">
            {costLine} WhatsApp steps go out only once Meta approves their template; until then
            those shoppers get the email.
          </div>
        </div>

        <div className="te-stack">
          <Card title="Preview">
            <div className="te-form">
              <select
                aria-label="Message to preview"
                className="te-input"
                onChange={(event) => setPreviewId(event.target.value)}
                value={preview?.id}
              >
                {previews.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              {preview?.channel === 'whatsapp' ? (
                <div className="te-wa">
                  <div className="te-wa__bubble">{preview.text}</div>
                  {preview.button ? <div className="te-wa__button">↗ {preview.button}</div> : null}
                </div>
              ) : preview ? (
                <div className="te-mail">
                  <p className="te-strong">{preview.subject}</p>
                  <p className="te-mail__body">{preview.text}</p>
                </div>
              ) : null}
              <p className="te-muted te-small">
                Sample order. Order facts only, no offers, so Meta keeps it a utility message.
              </p>
              {canEdit ? (
                <>
                  <div>
                    <label className="te-label" htmlFor="test-to">
                      {preview?.channel === 'email' ? 'Test email' : 'Test phone'}
                    </label>
                    <input
                      className="te-input"
                      id="test-to"
                      inputMode={preview?.channel === 'email' ? 'email' : 'tel'}
                      onChange={(event) => setTestTo(event.target.value)}
                      placeholder={
                        preview?.channel === 'email'
                          ? testEmail || 'you@example.com'
                          : '98765 43210'
                      }
                      value={testTo}
                    />
                  </div>
                  <Button
                    buttonStyle="secondary"
                    disabled={testing || (!testTo && preview?.channel !== 'email')}
                    onClick={sendTest}
                    size="medium"
                  >
                    {testing
                      ? 'Sending…'
                      : preview?.channel === 'email'
                        ? 'Send test to my email'
                        : 'Send test to my phone'}
                  </Button>
                </>
              ) : null}
            </div>
          </Card>

          <Card title="Timing and limits">
            <div className="te-form">
              <div>
                <label className="te-label" htmlFor="packed-delay">
                  “Packed” message delay
                </label>
                <div className="te-inline-field">
                  <input
                    className="te-input"
                    disabled={!canEdit || busy}
                    id="packed-delay"
                    inputMode="numeric"
                    onChange={(event) =>
                      setValues({
                        ...values,
                        packedDelayMinutes: Number(event.target.value.replace(/\D/g, '') || 0),
                      })
                    }
                    value={values.packedDelayMinutes}
                  />
                  <span className="te-muted">minutes</span>
                </div>
                <p className="te-field-help">Dropped if the parcel ships before then.</p>
                {field('packedDelayMinutes')}
              </div>
              <div>
                <label className="te-switch-row">
                  <Switch
                    checked={values.quietHours.enabled}
                    disabled={!canEdit || busy}
                    label="Quiet hours"
                    onChange={(enabled) =>
                      setValues({ ...values, quietHours: { ...values.quietHours, enabled } })
                    }
                  />
                  <span>Quiet hours</span>
                </label>
                <div className="te-inline-field">
                  <input
                    aria-label="Quiet hours start"
                    className="te-input"
                    disabled={!canEdit || busy || !values.quietHours.enabled}
                    onChange={(event) =>
                      setValues({
                        ...values,
                        quietHours: { ...values.quietHours, start: event.target.value },
                      })
                    }
                    type="time"
                    value={values.quietHours.start}
                  />
                  <span className="te-muted">to</span>
                  <input
                    aria-label="Quiet hours end"
                    className="te-input"
                    disabled={!canEdit || busy || !values.quietHours.enabled}
                    onChange={(event) =>
                      setValues({
                        ...values,
                        quietHours: { ...values.quietHours, end: event.target.value },
                      })
                    }
                    type="time"
                    value={values.quietHours.end}
                  />
                </div>
                <p className="te-field-help">Out for delivery and failed delivery still go out.</p>
                {field('quietHours.start') ?? field('quietHours.end')}
              </div>
              <label className="te-switch-row">
                <Switch
                  checked={values.whatsappOptInDefault}
                  disabled={!canEdit || busy}
                  label="Tick the WhatsApp box at checkout by default"
                  onChange={(whatsappOptInDefault) =>
                    setValues({ ...values, whatsappOptInDefault })
                  }
                />
                <span>Tick the WhatsApp box at checkout by default</span>
              </label>
              <div>
                <label className="te-label" htmlFor="staff-alerts">
                  Email us about new orders, failed deliveries and replies
                </label>
                <input
                  className="te-input"
                  disabled={!canEdit || busy}
                  id="staff-alerts"
                  onChange={(event) => setAlerts(event.target.value)}
                  placeholder="orders@yourstore.in, owner@yourstore.in"
                  value={alerts}
                />
                {Object.entries(errors).find(([key]) => key.startsWith('staffAlertEmails'))?.[1] ? (
                  <p className="te-field-error">
                    {Object.entries(errors).find(([key]) => key.startsWith('staffAlertEmails'))![1]}
                  </p>
                ) : null}
              </div>
              <p className="te-muted te-small">
                At most {perRecipientPerDay} messages per shopper per day.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

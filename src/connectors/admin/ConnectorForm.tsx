'use client'

import { Button, toast } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'

import { callApi } from '@/admin/client/api'
import { Notice, Pill, type Tone } from '@/admin/ui'

import type { ConnectorField } from '../core/providers'

type TestResult = { ok: boolean; message: string }

export type ConnectorFormProps = {
  tenantId: string
  providerKey: string
  label: string
  /** Whose dashboard the webhook goes in, when not the label ("Meta" for WhatsApp) */
  dashboardName?: string
  fields: readonly ConnectorField[]
  hasModes?: boolean
  mode: 'test' | 'live' | null
  values: Record<string, string>
  savedSecrets: string[]
  webhookUrl?: string | null
  webhookEvents?: readonly string[]
  /** Ours, for providers that prove webhooks with a token (Shiprocket) */
  webhookToken?: string | null
  webhookTokenLabel?: string
  webhookHelp?: ReactNode
  status: { tone: Tone; label: string }
  /** The latest health line ("Last good webhook today 10:41") */
  healthLine?: ReactNode
  /** A failing webhook or test, shown above the form */
  problem?: ReactNode
  canEdit: boolean
}

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="te-label">{label}</span>
      <div className="te-copy-row">
        <code className="te-input te-copy-row__value">{value}</code>
        <Button
          buttonStyle="secondary"
          onClick={() => {
            void navigator.clipboard.writeText(value).then(() => toast.success('Copied'))
          }}
          size="small"
        >
          Copy
        </Button>
      </div>
    </div>
  )
}

/**
 * One provider's setup card (docs/screens Payments, WhatsApp and SMS): visible settings, secrets
 * as "Saved · hidden" with Replace, the webhook address to paste, Save and Test connection.
 */
export function ConnectorForm(props: ConnectorFormProps) {
  const router = useRouter()
  const { fields, savedSecrets, canEdit } = props
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...props.values }))
  const [secrets, setSecrets] = useState<Record<string, string>>({})
  const [replacing, setReplacing] = useState<Set<string>>(
    () =>
      new Set(fields.filter((f) => f.secret && !savedSecrets.includes(f.key)).map((f) => f.key)),
  )
  const [mode, setMode] = useState<'test' | 'live'>(props.mode ?? 'test')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<'save' | 'test' | null>(null)
  const [test, setTest] = useState<TestResult | null>(null)

  const save = async () => {
    setBusy('save')
    setErrors({})
    const result = await callApi<{ savedSecrets: string[] }>(
      `/admin/v1/connectors/${props.providerKey}`,
      {
        body: {
          tenantId: props.tenantId,
          ...(props.hasModes ? { mode } : {}),
          public: values,
          secrets,
        },
      },
    )
    setBusy(null)
    if (!result.ok) {
      setErrors(result.error.fields ?? {})
      toast.error(result.error.message)
      return
    }
    setSecrets({})
    setReplacing(new Set())
    setTest(null)
    toast.success(`${props.label} saved. Test the connection to check the keys.`)
    router.refresh()
  }

  const runTest = async () => {
    setBusy('test')
    const result = await callApi<TestResult>(`/admin/v1/connectors/${props.providerKey}/test`, {
      body: { tenantId: props.tenantId },
    })
    setBusy(null)
    if (!result.ok) {
      toast.error(result.error.message)
      return
    }
    setTest(result.data)
    router.refresh()
  }

  const connected = savedSecrets.length > 0 || Object.keys(props.values).length > 0
  return (
    <div className="te-connector">
      <div className="te-connector__head">
        <span className="te-strong">{props.label}</span>
        <Pill tone={props.status.tone}>{props.status.label}</Pill>
        {props.hasModes ? (
          <span className="te-connector__mode">
            <span className="te-muted te-small">Mode</span>
            <span className="te-segmented" role="radiogroup" aria-label="Mode">
              {(['test', 'live'] as const).map((option) => (
                <button
                  aria-checked={mode === option}
                  className="te-segmented__option"
                  disabled={!canEdit}
                  key={option}
                  onClick={() => setMode(option)}
                  role="radio"
                  type="button"
                >
                  {option === 'test' ? 'Test' : 'Live'}
                </button>
              ))}
            </span>
          </span>
        ) : null}
      </div>
      {props.problem ? <Notice tone="danger">{props.problem}</Notice> : null}
      {props.hasModes && mode === 'test' && connected ? (
        <Notice tone="warning">
          Test mode: shoppers see a “test payments” notice and nobody is charged.
        </Notice>
      ) : null}
      <div className="te-form-grid">
        {fields.map((field) => {
          const id = `${props.providerKey}-${field.key}`
          const error = errors[field.key]
          const help = field.help ? (
            <p className="te-field-help" id={`${id}-help`}>
              {field.help}
            </p>
          ) : null
          if (field.secret && !replacing.has(field.key)) {
            return (
              <div key={field.key}>
                <span className="te-label">{field.label}</span>
                <div className="te-copy-row">
                  <span className="te-input te-copy-row__value te-muted">Saved · hidden</span>
                  {canEdit ? (
                    <Button
                      buttonStyle="secondary"
                      onClick={() => setReplacing((current) => new Set(current).add(field.key))}
                      size="small"
                    >
                      Replace
                    </Button>
                  ) : null}
                </div>
              </div>
            )
          }
          return (
            <div key={field.key}>
              <label className="te-label" htmlFor={id}>
                {field.label}
                {field.required ? <span className="te-required"> *</span> : null}
              </label>
              {field.options ? (
                <select
                  className="te-input"
                  disabled={!canEdit}
                  id={id}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, [field.key]: event.target.value }))
                  }
                  value={values[field.key] ?? field.options[0]?.value ?? ''}
                >
                  {field.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  aria-describedby={field.help ? `${id}-help` : undefined}
                  aria-invalid={error ? true : undefined}
                  autoComplete="off"
                  className="te-input"
                  disabled={!canEdit}
                  id={id}
                  onChange={(event) =>
                    field.secret
                      ? setSecrets((current) => ({ ...current, [field.key]: event.target.value }))
                      : setValues((current) => ({ ...current, [field.key]: event.target.value }))
                  }
                  placeholder={
                    field.secret && savedSecrets.includes(field.key)
                      ? 'Type the new value'
                      : field.placeholder
                  }
                  spellCheck={false}
                  type={field.secret ? 'password' : 'text'}
                  value={field.secret ? (secrets[field.key] ?? '') : (values[field.key] ?? '')}
                />
              )}
              {error ? <p className="te-field-error">{error}</p> : help}
            </div>
          )
        })}
        {props.webhookUrl ? (
          <div className="te-form-grid__wide">
            <CopyRow
              label={`Webhook address to paste in ${props.dashboardName ?? props.label}`}
              value={props.webhookUrl}
            />
          </div>
        ) : null}
        {props.webhookToken ? (
          <div className="te-form-grid__wide">
            <CopyRow
              label={props.webhookTokenLabel ?? 'Webhook token to paste with it'}
              value={props.webhookToken}
            />
          </div>
        ) : null}
      </div>
      {props.webhookEvents?.length ? (
        <p className="te-chips te-small">
          <span className="te-muted">
            Tick these events in {props.dashboardName ?? props.label}:
          </span>
          {props.webhookEvents.map((event) => (
            <span className="te-chip-static te-mono" key={event}>
              {event}
            </span>
          ))}
        </p>
      ) : null}
      {props.webhookHelp ? <p className="te-field-help">{props.webhookHelp}</p> : null}
      {/* A failed test shows above as the connector's problem once the page refreshes */}
      {test?.ok ? <Notice tone="success">{test.message}</Notice> : null}
      <div className="te-button-row te-connector__actions">
        {canEdit ? (
          <Button disabled={busy !== null} onClick={() => void save()} size="small">
            {busy === 'save' ? 'Saving…' : 'Save'}
          </Button>
        ) : null}
        {canEdit && connected ? (
          <Button
            buttonStyle="secondary"
            disabled={busy !== null}
            onClick={() => void runTest()}
            size="small"
          >
            {busy === 'test' ? 'Testing…' : 'Test connection'}
          </Button>
        ) : null}
        {props.healthLine ? <span className="te-muted te-small">{props.healthLine}</span> : null}
      </div>
    </div>
  )
}

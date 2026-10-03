'use client'

import { Button, toast } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { Fragment, useState } from 'react'

import { callApi } from '@/admin/client/api'
import { Pill } from '@/admin/ui'
import { getFeature } from '@/modules/features'

import type { FeatureState } from '../../services/features'

type Pending = { key: string; enabled: boolean; message: string }

const labels = (keys: string[]) => keys.map((key) => getFeature(key).label).join(' and ')

const humanize = (key: string) =>
  key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (char) => char.toUpperCase())
    .replace(/ Minor$/, ' (paise)')

function ConfigEditor({
  state,
  canEditCaps,
  onSaved,
}: {
  state: FeatureState
  canEditCaps: boolean
  onSaved: () => void
}) {
  const [config, setConfig] = useState<Record<string, unknown>>(() => ({ ...(state.config ?? {}) }))
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!state.flagId) return
    setSaving(true)
    // Payload's REST API: the feature-flags hook validates against the module's schema
    const response = await fetch(`/api/feature-flags/${state.flagId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    })
    setSaving(false)
    if (!response.ok) {
      const json = (await response.json().catch(() => null)) as {
        errors?: { message: string }[]
      } | null
      toast.error(json?.errors?.[0]?.message ?? 'Could not save the settings')
      return
    }
    toast.success(`${state.label} settings saved`)
    onSaved()
  }

  const setValue = (key: string, value: unknown) =>
    setConfig((current) => ({ ...current, [key]: value }))

  return (
    <div className="te-config">
      {Object.entries(config).map(([key, value]) => {
        const isCap = state.platformConfigKeys.includes(key)
        const disabled = isCap && !canEditCaps
        const id = `cfg-${state.key}-${key}`
        let input
        if (typeof value === 'boolean') {
          input = (
            <input
              checked={value}
              disabled={disabled}
              id={id}
              onChange={(e) => setValue(key, e.target.checked)}
              type="checkbox"
            />
          )
        } else if (typeof value === 'number') {
          input = (
            <input
              className="te-input te-input--short"
              disabled={disabled}
              id={id}
              onChange={(e) => setValue(key, e.target.value === '' ? null : Number(e.target.value))}
              type="number"
              value={value}
            />
          )
        } else if (Array.isArray(value)) {
          input = (
            <input
              className="te-input"
              disabled={disabled}
              id={id}
              onChange={(e) =>
                setValue(
                  key,
                  e.target.value
                    .split(',')
                    .map((part) => part.trim())
                    .filter(Boolean),
                )
              }
              value={value.join(', ')}
            />
          )
        } else if (value && typeof value === 'object') {
          const nested = value as Record<string, unknown>
          input = (
            <span className="te-config__nested">
              {Object.entries(nested).map(([subKey, subValue]) => (
                <label key={subKey}>
                  {humanize(subKey)}{' '}
                  <input
                    className="te-input te-input--short"
                    disabled={disabled}
                    onChange={(e) => setValue(key, { ...nested, [subKey]: e.target.value })}
                    value={String(subValue ?? '')}
                  />
                </label>
              ))}
            </span>
          )
        } else {
          input = (
            <input
              className="te-input"
              disabled={disabled}
              id={id}
              onChange={(e) => setValue(key, e.target.value === '' ? null : e.target.value)}
              value={value === null || value === undefined ? '' : String(value)}
            />
          )
        }
        return (
          <div className="te-config__row" key={key}>
            <label htmlFor={id}>
              {humanize(key)} {isCap ? <Pill tone="info">Platform cap</Pill> : null}
            </label>
            {input}
          </div>
        )
      })}
      <div>
        <Button disabled={saving || !state.flagId} onClick={() => void save()} size="small">
          Save settings
        </Button>
      </div>
    </div>
  )
}

/** One section of the Features tab (docs/screens Vendor features). */
export function FeatureTable({
  tenantId,
  title,
  states,
  canEdit,
  canEditCaps,
}: {
  tenantId: string
  title: string
  states: FeatureState[]
  canEdit: boolean
  canEditCaps: boolean
}) {
  const router = useRouter()
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [openSettings, setOpenSettings] = useState<string | null>(null)

  const toggle = async (key: string, enabled: boolean, cascade = false) => {
    setBusyKey(key)
    const result = await callApi(`/admin/v1/platform/tenants/${tenantId}/features`, {
      method: 'PATCH',
      body: { key, enabled, cascade },
    })
    setBusyKey(null)
    if (!result.ok) {
      if (result.error.code === 'FEATURE_DEPENDENCY' && !cascade) {
        setPending({ key, enabled, message: result.error.message })
        return
      }
      toast.error(result.error.message)
      return
    }
    setPending(null)
    toast.success('Saved. The live store has the change now.')
    router.refresh()
  }

  return (
    <section className="te-card">
      <header className="te-card__header">
        <h3 className="te-card__title">{title}</h3>
      </header>
      <div className="te-card__body te-card__body--flush">
        <table className="te-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th>Key</th>
              <th>In plan</th>
              <th>On</th>
              <th aria-label="Settings" />
            </tr>
          </thead>
          <tbody>
            {states.map((state) => {
              const locked = !state.available || !state.inPlan
              const lockReason = !state.available ? 'Phase 2' : 'Not in plan'
              return (
                <Fragment key={state.key}>
                  <tr className={locked ? 'te-table__row--locked' : undefined}>
                    <td>
                      <div className="te-strong">{state.label}</div>
                      {state.description ? (
                        <div className="te-muted te-small">{state.description}</div>
                      ) : null}
                      {state.dependsOn.length > 0 ? (
                        <div className="te-muted te-small">Needs {labels(state.dependsOn)}</div>
                      ) : null}
                      {state.on && !state.enabled && !locked ? (
                        <div className="te-text--warning te-small">
                          Switched on, but waiting for {labels(state.dependsOn)}
                        </div>
                      ) : null}
                    </td>
                    <td className="te-mono te-small">{state.key}</td>
                    <td>{state.inPlan ? '✓' : <span className="te-muted">—</span>}</td>
                    <td>
                      {locked ? (
                        <Pill>{lockReason === 'Phase 2' ? 'Phase 2' : 'Locked'}</Pill>
                      ) : (
                        <label className="te-switch">
                          <input
                            aria-label={`${state.label} ${state.on ? 'on' : 'off'}`}
                            checked={state.on}
                            disabled={!canEdit || busyKey !== null}
                            onChange={(event) => void toggle(state.key, event.target.checked)}
                            type="checkbox"
                          />
                          <span className="te-switch__track" />
                        </label>
                      )}
                    </td>
                    <td>
                      {state.hasConfig && state.on && !locked ? (
                        <button
                          className="te-link-button"
                          onClick={() =>
                            setOpenSettings(openSettings === state.key ? null : state.key)
                          }
                          type="button"
                        >
                          {openSettings === state.key ? 'Close' : 'Settings'}
                        </button>
                      ) : (
                        <span className="te-muted">—</span>
                      )}
                    </td>
                  </tr>
                  {pending?.key === state.key ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="te-confirm">
                          <p>{pending.message}</p>
                          <div className="te-confirm__buttons">
                            <Button
                              onClick={() => void toggle(pending.key, pending.enabled, true)}
                              size="small"
                            >
                              {pending.enabled ? 'Switch both on' : 'Switch them off too'}
                            </Button>
                            <Button
                              buttonStyle="secondary"
                              onClick={() => setPending(null)}
                              size="small"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                  {openSettings === state.key ? (
                    <tr>
                      <td colSpan={5}>
                        <ConfigEditor
                          canEditCaps={canEditCaps}
                          onSaved={() => router.refresh()}
                          state={state}
                        />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

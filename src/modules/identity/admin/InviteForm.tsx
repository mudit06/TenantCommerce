'use client'

import { Button, toast } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import {
  PLATFORM_ROLE_LABELS,
  PLATFORM_ROLES,
  TENANT_ROLE_LABELS,
  TENANT_ROLES,
} from '@/access/roles'
import { callApi } from '@/admin/client/api'

/**
 * Invite staff to a store (tenantId set) or a teammate to our platform team (no tenantId).
 * The set-password link goes by email only (docs/05).
 */
export function InviteForm({
  tenantId,
  disabledReason,
}: {
  tenantId?: string
  disabledReason?: string
}) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [roles, setRoles] = useState<string[]>(tenantId ? ['manager'] : [])
  const [platformRole, setPlatformRole] = useState<string>('support')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    setErrors({})
    const body = tenantId ? { email, name, tenantId, roles } : { email, name, platformRole }
    const result = await callApi<{ addedToExistingAccount: boolean }>('/admin/v1/staff/invites', {
      body,
    })
    setBusy(false)
    if (!result.ok) {
      setErrors({ _: result.error.message, ...(result.error.fields ?? {}) })
      return
    }
    toast.success(
      result.data.addedToExistingAccount
        ? `${email} already had an account and now has access`
        : `Invite emailed to ${email}`,
    )
    setEmail('')
    setName('')
    router.refresh()
  }

  const toggleRole = (role: string) =>
    setRoles((current) =>
      current.includes(role) ? current.filter((r) => r !== role) : [...current, role],
    )

  return (
    <div className="te-form">
      <label className="te-label" htmlFor="invite-email">
        Email
      </label>
      <input
        autoComplete="off"
        className="te-input"
        id="invite-email"
        onChange={(e) => setEmail(e.target.value)}
        placeholder={tenantId ? 'name@vendor.example' : 'name@tenantecom.in'}
        type="email"
        value={email}
      />
      {errors.email ? <p className="te-field-error">{errors.email}</p> : null}
      <label className="te-label" htmlFor="invite-name">
        Name
      </label>
      <input
        className="te-input"
        id="invite-name"
        onChange={(e) => setName(e.target.value)}
        value={name}
      />
      {errors.name ? <p className="te-field-error">{errors.name}</p> : null}
      {tenantId ? (
        <fieldset className="te-fieldset">
          <legend className="te-label">Roles</legend>
          <div className="te-chips">
            {TENANT_ROLES.map((role) => (
              <label className="te-chip" key={role}>
                <input
                  checked={roles.includes(role)}
                  onChange={() => toggleRole(role)}
                  type="checkbox"
                />
                {TENANT_ROLE_LABELS[role]}
              </label>
            ))}
          </div>
          {errors.roles ? <p className="te-field-error">{errors.roles}</p> : null}
        </fieldset>
      ) : (
        <>
          <label className="te-label" htmlFor="invite-role">
            Role
          </label>
          <select
            className="te-input"
            id="invite-role"
            onChange={(e) => setPlatformRole(e.target.value)}
            value={platformRole}
          >
            {PLATFORM_ROLES.map((role) => (
              <option key={role} value={role}>
                {PLATFORM_ROLE_LABELS[role]}
                {role === 'support' ? ' (read-only everywhere)' : ' (full control of every store)'}
              </option>
            ))}
          </select>
        </>
      )}
      {errors._ ? (
        <p className="te-text--danger te-small" role="alert">
          {errors._}
        </p>
      ) : null}
      <Button
        disabled={busy || Boolean(disabledReason) || !email || !name}
        onClick={() => void submit()}
      >
        Send invite
      </Button>
      {disabledReason ? <p className="te-muted te-small">{disabledReason}</p> : null}
    </div>
  )
}

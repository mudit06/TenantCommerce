'use client'

import { Button, toast } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { TENANT_ROLE_LABELS, TENANT_ROLES } from '@/access/roles'
import { callApi } from '@/admin/client/api'

/** Change a colleague's roles in this store, or remove them from it (owners and super admins). */
export function MemberActions({
  userId,
  tenantId,
  roles: initialRoles,
  name,
}: {
  userId: string
  tenantId: string
  roles: string[]
  name: string
}) {
  const router = useRouter()
  const [mode, setMode] = useState<'idle' | 'roles' | 'remove'>('idle')
  const [roles, setRoles] = useState(initialRoles)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (path: string, method: 'PATCH' | 'POST', body: unknown, done: string) => {
    setBusy(true)
    setError(null)
    const result = await callApi(path, { method, body })
    setBusy(false)
    if (!result.ok) {
      setError(result.error.fields?.roles ?? result.error.message)
      return
    }
    toast.success(done)
    setMode('idle')
    router.refresh()
  }

  if (mode === 'roles') {
    return (
      <div className="te-inline-confirm">
        <div className="te-chips">
          {TENANT_ROLES.map((role) => (
            <label className="te-chip" key={role}>
              <input
                checked={roles.includes(role)}
                onChange={() =>
                  setRoles((current) =>
                    current.includes(role) ? current.filter((r) => r !== role) : [...current, role],
                  )
                }
                type="checkbox"
              />
              {TENANT_ROLE_LABELS[role]}
            </label>
          ))}
        </div>
        {error ? (
          <p className="te-field-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="te-button-row">
          <Button
            buttonStyle="primary"
            disabled={busy || roles.length === 0}
            onClick={() =>
              void run(
                `/admin/v1/staff/${userId}/roles`,
                'PATCH',
                { tenantId, roles },
                `Roles saved for ${name}`,
              )
            }
            size="small"
          >
            Save roles
          </Button>
          <Button
            buttonStyle="secondary"
            disabled={busy}
            onClick={() => setMode('idle')}
            size="small"
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  if (mode === 'remove') {
    return (
      <div className="te-inline-confirm">
        <p className="te-small">Remove {name} from this store? They lose access straight away.</p>
        {error ? (
          <p className="te-field-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="te-button-row">
          <Button
            buttonStyle="error"
            disabled={busy}
            onClick={() =>
              void run(`/admin/v1/staff/${userId}/remove`, 'POST', { tenantId }, `${name} removed`)
            }
            size="small"
          >
            Remove
          </Button>
          <Button
            buttonStyle="secondary"
            disabled={busy}
            onClick={() => setMode('idle')}
            size="small"
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <span className="te-button-row">
      <button className="te-link-button" onClick={() => setMode('roles')} type="button">
        Change roles
      </button>
      <button className="te-link-button" onClick={() => setMode('remove')} type="button">
        Remove
      </button>
    </span>
  )
}

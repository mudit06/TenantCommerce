import type { AdminViewServerProps } from 'payload'

import { storeSessionOf } from '@/access'
import { currentStore, storeRolesOf, type CurrentStore } from '@/admin/store'
import { requireSignedIn } from '@/admin/session/requireSignedIn'
import { Notice } from '@/admin/ui'
import { formatDateAndTime } from '@/lib/dates'

import type { ConnectorSummary } from '../core/service'

/**
 * The store a keys screen is about and whether this person may change them: the owner, or our
 * super admin managing the store. Our team viewing as support sees the screen read-only.
 */
export async function keysScreenContext(view: AdminViewServerProps, path: string) {
  const { req } = view.initPageResult
  requireSignedIn(req.user, path)
  const store = await currentStore(req.payload, req.user)
  if (!store) return { store: null, canSee: false, canEdit: false } as const
  const roles = storeRolesOf(req.user, store.id)
  const session = storeSessionOf(req.user)
  const canEdit = roles.includes('owner') && (!session || session.mode === 'manage')
  const canSee = canEdit || Boolean(session)
  return { store, canSee, canEdit } as { store: CurrentStore; canSee: boolean; canEdit: boolean }
}

export function OwnerOnly() {
  return (
    <div className="te-page">
      <Notice tone="danger">
        Only the store owner sees payment and messaging keys. Ask your owner to change them.
      </Notice>
    </div>
  )
}

/** The status pill of a connector card, from its saved keys and its last test or webhook. */
export function connectorStatus(summary: ConnectorSummary) {
  if (!summary.availability.allowed) {
    return {
      tone: 'neutral',
      label: summary.availability.inPlan ? 'Switched off' : 'Not in plan',
    } as const
  }
  if (!summary.connected) return { tone: 'neutral', label: 'Not connected' } as const
  if (summary.health?.failingSince) return { tone: 'danger', label: 'Failing' } as const
  if (summary.health?.lastTestOk === false)
    return { tone: 'danger', label: 'Keys refused' } as const
  if (summary.health?.lastTestOk) return { tone: 'success', label: 'Connected' } as const
  return { tone: 'warning', label: 'Saved, not tested' } as const
}

/** "Last good webhook today 10:41 · tested 9:12" */
export function healthLine(summary: ConnectorSummary): string | null {
  const health = summary.health
  const parts = [
    health?.lastWebhookOkAt
      ? `Last good webhook ${formatDateAndTime(health.lastWebhookOkAt)}`
      : null,
    health?.lastTestAt
      ? `Tested ${formatDateAndTime(health.lastTestAt)}${health.lastTestOk ? '' : ': failed'}`
      : null,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

/** "Webhooks failing since 10:42: signature mismatch." */
export function problemLine(summary: ConnectorSummary): string | null {
  const health = summary.health
  if (health?.failingSince) {
    return `Failing since ${formatDateAndTime(health.failingSince)}${health.lastError ? `: ${health.lastError}` : ''}`
  }
  if (health?.lastTestOk === false && health.lastTestMessage) return health.lastTestMessage
  return null
}

import type { PayloadRequest, ServerProps } from 'payload'

import { storeSessionOf } from '@/access'
import { currentStore } from '@/admin/store'
import { Icon } from '@/admin/ui/icons'
import { formatTime } from '@/lib/dates'

import { EndStoreSessionButton } from './EndStoreSessionButton'

/**
 * Shown on every page while one of our team works inside a store (docs/05): whose store, as
 * whom, why, and when the session ends, with a way back to the platform panel.
 */
export async function StoreSessionBanner({ req }: ServerProps & { req?: PayloadRequest }) {
  const session = storeSessionOf(req?.user)
  if (!req || !session) return null
  const store = await currentStore(req.payload, req.user)
  const name =
    (req.user && 'name' in req.user && typeof req.user.name === 'string' && req.user.name) || 'you'
  const storeName = store?.name ?? session.tenantName ?? 'this store'
  const managing = session.mode === 'manage'
  return (
    <div
      className={`te-session-banner te-session-banner--${session.mode}`}
      role="status"
      aria-label="Platform session"
    >
      <Icon name={managing ? 'shield' : 'eye'} size={16} />
      <p className="te-session-banner__text">
        <strong>
          {managing
            ? `You are managing ${storeName} as platform admin (${name})`
            : `You are viewing ${storeName} as support (${name}), read-only`}
        </strong>
        <span className="te-session-banner__meta">
          {session.reason} · ends {formatTime(session.endsAt)}
          {managing ? ' · every change is logged for the store owner' : ''}
        </span>
      </p>
      <EndStoreSessionButton />
    </div>
  )
}

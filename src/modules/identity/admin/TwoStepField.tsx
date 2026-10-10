import type { UIFieldServerComponent } from 'payload'

import { isPlatformStaff, isSuperAdmin } from '@/access'
import { Card, Pill } from '@/admin/ui'
import { formatDate } from '@/lib/dates'

import { ResetTwoStepButton } from './ResetTwoStepButton'
import { TwoStepOff } from './TwoStepOff'
import { TwoStepSetup } from './TwoStepSetup'

/**
 * Two-step sign-in on a staff account (docs/05): set it up or turn it off on your own account
 * (our team can't turn it off), or reset it for someone else as a super admin.
 */
export const TwoStepField: UIFieldServerComponent = async ({ id, req }) => {
  if (!id || !req.user) return null
  const own = String(req.user.id) === String(id)
  if (!own && !isSuperAdmin(req.user)) return null
  const user = await req.payload
    .findByID({ collection: 'users', id, depth: 0, overrideAccess: true })
    .catch(() => null)
  if (!user) return null
  const enabled = Boolean(user.twoFactorEnabled)
  return (
    <Card
      actions={enabled ? <Pill tone="success">On</Pill> : <Pill tone="neutral">Off</Pill>}
      title="Two-step sign-in"
    >
      {enabled ? (
        <p className="te-small">
          Every sign-in asks for a code from the authenticator app
          {user.twoFactorEnabledAt ? `, since ${formatDate(user.twoFactorEnabledAt)}` : ''}.
        </p>
      ) : (
        <p className="te-small te-muted">
          {own
            ? 'Add a code from your phone to every sign-in, so a stolen password alone can’t open your store.'
            : `${user.name} signs in with a password only.`}
        </p>
      )}
      {own && !enabled ? <TwoStepSetup /> : null}
      {own && enabled && !isPlatformStaff(user) ? <TwoStepOff /> : null}
      {!own && enabled ? <ResetTwoStepButton name={user.name} userId={String(user.id)} /> : null}
    </Card>
  )
}

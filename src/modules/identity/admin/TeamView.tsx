import { DefaultTemplate } from '@payloadcms/next/templates'
import type { AdminViewServerProps } from 'payload'

import { isPlatformStaff, isSuperAdmin } from '@/access'
import { Card, Notice, Pill, Row, Rows } from '@/admin/ui'
import { requireSignedIn } from '@/admin/session/requireSignedIn'
import { adminUrl } from '@/admin/paths'

import {
  LOCK_MINUTES,
  MAX_LOGIN_ATTEMPTS,
  MIN_PASSWORD_LENGTH,
  SESSION_SECONDS,
} from '../constants'
import { InviteForm } from './InviteForm'
import { StaffTable } from './StaffTable'

/** docs/screens/super-admin.md "Team and access": our own team's accounts. */
export async function TeamView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, permissions, visibleEntities, locale } = initPageResult
  requireSignedIn(req.user, adminUrl.team)
  const allowed = isPlatformStaff(req.user)
  const { docs: team } = allowed
    ? await req.payload.find({
        collection: 'users',
        where: { platformRole: { exists: true } },
        sort: 'name',
        depth: 0,
        pagination: false,
        overrideAccess: true,
      })
    : { docs: [] }
  const canManage = isSuperAdmin(req.user)

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      req={req}
      searchParams={searchParams}
      user={req.user ?? undefined}
      visibleEntities={visibleEntities}
    >
      <div className="te-page">
        <header className="te-page__header">
          <div>
            <h1 className="te-page__title">Team and access</h1>
            <p className="te-page__subtitle">
              {team.length} {team.length === 1 ? 'person' : 'people'} · our team only, never a
              vendor’s staff
            </p>
          </div>
        </header>
        {!allowed ? (
          <Notice tone="danger">This screen is for the platform team.</Notice>
        ) : (
          <div className="te-grid te-grid--2-1">
            <Card title="People">
              <StaffTable canManage={canManage} canResetTwoStep={canManage} users={team} />
            </Card>
            <div className="te-stack">
              {canManage ? (
                <Card title="Invite a teammate">
                  <InviteForm />
                </Card>
              ) : null}
              <Card title="Security">
                <Rows>
                  <Row
                    aside={
                      <span className="te-inline">
                        <Pill tone="success">Required</Pill>
                      </span>
                    }
                    primary="Two-step verification"
                    secondary="Every platform account signs in with an authenticator code. It can’t be switched off; a super admin resets it for a lost phone, and resets are logged."
                  />
                  <Row aside={`${SESSION_SECONDS / 3600} hours`} primary="Session length" />
                  <Row
                    aside={`${MAX_LOGIN_ATTEMPTS} tries, ${LOCK_MINUTES} min`}
                    primary="Lock after failed sign-ins"
                  />
                  <Row aside={`${MIN_PASSWORD_LENGTH}+ characters`} primary="Password length" />
                  <Row
                    aside="Viewer later"
                    primary="Support access log"
                    secondary="Every platform action is written to the audit log now."
                  />
                </Rows>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DefaultTemplate>
  )
}

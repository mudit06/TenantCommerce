import { randomBytes } from 'node:crypto'

import type { PayloadRequest } from 'payload'
import { z } from 'zod'

import {
  hasTenantRole,
  idOf,
  isSuperAdmin,
  PLATFORM_ROLE_LABELS,
  PLATFORM_ROLES,
  TENANT_ROLE_LABELS,
  TENANT_ROLES,
} from '@/access'
import { addedToStoreEmail, staffInviteEmail } from '@/emails/staffInvite'
import { env } from '@/lib/env'
import { AppError } from '@/lib/errors'
import { recordAudit } from '@/modules/audit'
import type { User } from '@/payload-types'

import { INVITE_VALID_HOURS } from '../constants'

export const inviteInputSchema = z
  .object({
    email: z.email('Enter a valid email').transform((value) => value.trim().toLowerCase()),
    name: z.string().trim().min(1, 'Enter a name').max(120),
    tenantId: z.string().min(1).optional(),
    roles: z.array(z.enum(TENANT_ROLES)).min(1, 'Pick at least one role').optional(),
    platformRole: z.enum(PLATFORM_ROLES).optional(),
  })
  .refine(
    (input) => Boolean(input.platformRole) !== Boolean(input.tenantId && input.roles?.length),
    { message: 'Invite either a teammate (platform role) or store staff (store and roles)' },
  )

export type InviteInput = z.infer<typeof inviteInputSchema>

export type InviteResult = {
  userId: string
  /** The set-password link. Only for server-side callers (scripts); endpoints never return it. */
  inviteUrl: string
  emailed: boolean
  addedToExistingAccount: boolean
}

const adminUrl = (path: string) => `${env.ADMIN_URL.replace(/\/$/, '')}${path}`

function inviterName(req: PayloadRequest): string | undefined {
  const user = req.user as Partial<User> | null | undefined
  return user?.name ?? undefined
}

async function newSetPasswordLink(req: PayloadRequest, email: string): Promise<string> {
  // Payload's reset-password token doubles as the invite: single use, replaced by a resend
  const token = await req.payload.forgotPassword({
    collection: 'users',
    data: { email },
    disableEmail: true,
    expiration: INVITE_VALID_HOURS * 60 * 60 * 1000,
    req,
  })
  return adminUrl(`/admin/reset/${token}`)
}

async function assertCanInvite(req: PayloadRequest, input: InviteInput) {
  if (!req.user) return // scripts and onboarding run as the system
  if (input.platformRole && !isSuperAdmin(req.user)) {
    throw new AppError('FORBIDDEN', 'Only super admins invite teammates', 403)
  }
  if (
    input.tenantId &&
    !isSuperAdmin(req.user) &&
    !hasTenantRole(req.user, input.tenantId, ['owner'])
  ) {
    throw new AppError('FORBIDDEN', 'Only the store owner or our team can invite staff', 403)
  }
}

async function assertStaffLimit(req: PayloadRequest, tenantId: string) {
  const tenant = await req.payload
    .findByID({ collection: 'tenants', id: tenantId, depth: 1, overrideAccess: true, req })
    .catch(() => null)
  if (!tenant) throw new AppError('NOT_FOUND', 'Store not found', 404)
  const max = typeof tenant.plan === 'object' ? tenant.plan?.limits?.maxStaffUsers : undefined
  if (!max) return tenant
  const { totalDocs } = await req.payload.count({
    collection: 'users',
    where: { 'tenants.tenant': { equals: tenantId } },
    overrideAccess: true,
    req,
  })
  if (totalDocs >= max) {
    throw new AppError(
      'PLAN_LIMIT_REACHED',
      `This store already has ${totalDocs} of ${max} staff accounts allowed by its plan`,
      422,
    )
  }
  return tenant
}

/**
 * Invites a teammate or a store's staff member (docs/05: accounts are only ever created by
 * invite). Someone who already has an account is added to the store instead.
 */
export async function inviteStaff(
  req: PayloadRequest,
  rawInput: InviteInput,
  options: { sendEmail?: boolean } = {},
): Promise<InviteResult> {
  const input = inviteInputSchema.parse(rawInput)
  const sendEmail = options.sendEmail ?? true
  await assertCanInvite(req, input)
  const tenant = input.tenantId ? await assertStaffLimit(req, input.tenantId) : null
  const roleLabel = input.platformRole
    ? PLATFORM_ROLE_LABELS[input.platformRole]
    : (input.roles ?? []).map((role) => TENANT_ROLE_LABELS[role]).join(', ')

  const { docs } = await req.payload.find({
    collection: 'users',
    where: { email: { equals: input.email } },
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
  })
  const existing = docs[0]

  if (existing) {
    if (input.platformRole || !tenant) {
      throw new AppError('CONFLICT', 'Someone with this email already has an account', 409, {
        email: 'Already has an account',
      })
    }
    const memberships = existing.tenants ?? []
    if (memberships.some((row) => idOf(row.tenant) === String(tenant.id))) {
      throw new AppError('CONFLICT', 'This person already works in this store', 409, {
        email: 'Already in this store',
      })
    }
    await req.payload.update({
      collection: 'users',
      id: existing.id,
      data: { tenants: [...memberships, { tenant: tenant.id, roles: input.roles ?? [] }] },
      overrideAccess: true,
      req,
      context: { skipAudit: true },
    })
    let inviteUrl = adminUrl('/admin/login')
    if (sendEmail) {
      if (existing.status === 'invited') {
        inviteUrl = await newSetPasswordLink(req, existing.email)
        await req.payload.sendEmail({
          to: existing.email,
          ...staffInviteEmail({
            name: existing.name,
            invitedByName: inviterName(req),
            storeName: tenant.name,
            roleLabel,
            link: inviteUrl,
            validHours: INVITE_VALID_HOURS,
          }),
        })
      } else {
        await req.payload.sendEmail({
          to: existing.email,
          ...addedToStoreEmail({
            name: existing.name,
            storeName: tenant.name,
            roleLabel,
            link: inviteUrl,
          }),
        })
      }
    }
    await recordAudit(req, {
      action: 'staff_invited',
      tenant: String(tenant.id),
      collectionSlug: 'users',
      docId: String(existing.id),
      summary: `Added ${existing.email} as ${roleLabel}`,
    })
    return {
      userId: String(existing.id),
      inviteUrl,
      emailed: sendEmail,
      addedToExistingAccount: true,
    }
  }

  const user = await req.payload.create({
    collection: 'users',
    data: {
      email: input.email,
      name: input.name,
      // Unusable until the invitee sets their own through the link
      password: randomBytes(32).toString('base64url'),
      status: 'invited',
      platformRole: input.platformRole,
      tenants: tenant ? [{ tenant: tenant.id, roles: input.roles ?? [] }] : [],
      invitedBy: req.user?.collection === 'users' ? req.user.id : undefined,
      invitedAt: new Date().toISOString(),
    },
    overrideAccess: true,
    req,
  })
  const inviteUrl = await newSetPasswordLink(req, user.email)
  if (sendEmail) {
    await req.payload.sendEmail({
      to: user.email,
      ...staffInviteEmail({
        name: user.name,
        invitedByName: inviterName(req),
        storeName: tenant?.name,
        roleLabel,
        link: inviteUrl,
        validHours: INVITE_VALID_HOURS,
      }),
    })
  }
  await recordAudit(req, {
    action: 'staff_invited',
    tenant: tenant ? String(tenant.id) : null,
    collectionSlug: 'users',
    docId: String(user.id),
    summary: `Invited ${user.email} as ${roleLabel}`,
  })
  return { userId: String(user.id), inviteUrl, emailed: sendEmail, addedToExistingAccount: false }
}

/** A fresh link for someone who hasn't accepted yet; the old link stops working. */
export async function resendInvite(req: PayloadRequest, userId: string): Promise<InviteResult> {
  const user = await req.payload
    .findByID({ collection: 'users', id: userId, depth: 1, overrideAccess: true, req })
    .catch(() => null)
  if (!user) throw new AppError('NOT_FOUND', 'User not found', 404)
  if (user.status !== 'invited') {
    throw new AppError('BUSINESS_RULE', 'This person has already accepted the invite', 409)
  }
  const tenantIds = (user.tenants ?? []).map((row) => idOf(row.tenant)).filter(Boolean) as string[]
  if (req.user && !isSuperAdmin(req.user)) {
    const ownsOne = tenantIds.some((id) => hasTenantRole(req.user, id, ['owner']))
    if (!ownsOne || user.platformRole) {
      throw new AppError(
        'FORBIDDEN',
        'Only the store owner or our team can resend this invite',
        403,
      )
    }
  }
  const firstMembership = user.tenants?.[0]
  const store =
    firstMembership && typeof firstMembership.tenant === 'object' ? firstMembership.tenant : null
  const roleLabel = user.platformRole
    ? PLATFORM_ROLE_LABELS[user.platformRole]
    : (firstMembership?.roles ?? []).map((role) => TENANT_ROLE_LABELS[role]).join(', ')
  const inviteUrl = await newSetPasswordLink(req, user.email)
  await req.payload.sendEmail({
    to: user.email,
    ...staffInviteEmail({
      name: user.name,
      invitedByName: inviterName(req),
      storeName: store?.name,
      roleLabel,
      link: inviteUrl,
      validHours: INVITE_VALID_HOURS,
    }),
  })
  await recordAudit(req, {
    action: 'staff_invited',
    tenant: tenantIds[0] ?? null,
    collectionSlug: 'users',
    docId: String(user.id),
    summary: `Resent the invite to ${user.email}`,
  })
  return { userId: String(user.id), inviteUrl, emailed: true, addedToExistingAccount: false }
}

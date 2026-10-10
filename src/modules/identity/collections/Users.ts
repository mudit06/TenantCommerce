import { APIError, type CollectionConfig } from 'payload'

import {
  fieldPlatformStaffOnly,
  fieldSuperAdminOnly,
  isPlatformStaff,
  isSuperAdmin,
  PLATFORM_ROLE_LABELS,
  PLATFORM_ROLES,
  STORE_SESSION_MODE_LABELS,
  STORE_SESSION_MODES,
  superAdminOnly,
  tenantIdsWithRoles,
  USER_STATUSES,
  nobody,
} from '@/access'
import { recordAudit } from '@/modules/audit'

import {
  LOCK_MINUTES,
  MAX_LOGIN_ATTEMPTS,
  MIN_PASSWORD_LENGTH,
  SESSION_SECONDS,
} from '../constants'
import { checkTwoStepAtSignIn } from '../services/twoStep'

/** Staff and platform admins (docs/05). Shoppers are `customers`, a separate auth collection. */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Staff user', plural: 'Staff users' },
  auth: {
    // Loads each membership's store, so menus can hide features a store has switched off
    // (tenancy userHasFeature)
    depth: 1,
    tokenExpiration: SESSION_SECONDS,
    maxLoginAttempts: MAX_LOGIN_ATTEMPTS,
    lockTime: LOCK_MINUTES * 60 * 1000,
    // Scripts and server-to-server calls use a dedicated user with an API key (docs/05)
    useAPIKey: true,
    cookies: {
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
    },
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'platformRole', 'status', 'lastLoginAt'],
    group: 'Platform',
    description: 'Everyone who signs in to the admin: our team and every store’s staff.',
    // Store owners manage their colleagues on Staff and roles (/admin/staff)
    hidden: ({ user }) => !isPlatformStaff(user),
  },
  access: {
    // Signed-in staff who are not disabled may open the admin; vendor staff need a store role
    admin: ({ req }) => isPlatformStaff(req.user) || tenantIdsWithRoles(req.user).length > 0,
    // Accounts are only ever created by invite (identity/services/invites)
    create: nobody,
    // The multi-tenant plugin narrows this to "yourself and people in your stores"
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => {
      if (isSuperAdmin(req.user)) return true
      return req.user ? { id: { equals: req.user.id } } : false
    },
    delete: superAdminOnly,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'phone', label: 'Mobile', type: 'text' },
    {
      name: 'platformRole',
      label: 'Platform role',
      type: 'select',
      options: PLATFORM_ROLES.map((value) => ({ value, label: PLATFORM_ROLE_LABELS[value] })),
      access: { create: fieldSuperAdminOnly, update: fieldSuperAdminOnly },
      admin: {
        position: 'sidebar',
        description: 'Our team only. Leave empty for vendor staff.',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'invited',
      options: USER_STATUSES.map((value) => ({
        value,
        label: value.charAt(0).toUpperCase() + value.slice(1),
      })),
      access: { create: fieldSuperAdminOnly, update: fieldSuperAdminOnly },
      admin: { position: 'sidebar' },
    },
    {
      name: 'lastLoginAt',
      label: 'Last sign-in',
      type: 'date',
      admin: { position: 'sidebar', readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
      access: { create: () => false, update: () => false },
    },
    // ---- Two-step sign-in (docs/05). Written only by identity/services/twoStep ---------------
    {
      name: 'twoStepPanel',
      type: 'ui',
      admin: {
        components: { Field: '@/modules/identity/admin/TwoStepField#TwoStepField' },
        disableListColumn: true,
      },
    },
    {
      name: 'twoFactorEnabled',
      label: 'Two-step sign-in',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar', readOnly: true },
      access: { create: () => false, update: () => false },
    },
    {
      name: 'twoFactorEnabledAt',
      type: 'date',
      admin: { hidden: true },
      access: { create: () => false, update: () => false },
    },
    // The authenticator secret (sealed like connector keys), the one being set up, wrong-code
    // count, lock and the last step used. No API can read or write these.
    ...(['twoFactorSecret', 'twoFactorPending'] as const).map((name) => ({
      name,
      type: 'text' as const,
      admin: { hidden: true },
      access: { read: () => false, create: () => false, update: () => false },
    })),
    ...(['twoFactorFailures', 'twoFactorLastStep'] as const).map((name) => ({
      name,
      type: 'number' as const,
      admin: { hidden: true },
      access: { read: () => false, create: () => false, update: () => false },
    })),
    {
      name: 'twoFactorLockedUntil',
      type: 'date',
      admin: { hidden: true },
      access: { read: () => false, create: () => false, update: () => false },
    },
    {
      name: 'invitedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: { position: 'sidebar', readOnly: true },
      access: { create: () => false, update: () => false },
    },
    {
      name: 'invitedAt',
      type: 'date',
      admin: { position: 'sidebar', readOnly: true },
      access: { create: () => false, update: () => false },
    },
    {
      // "Manage store" / "View as support" (docs/05): written only by the store-session service
      // (identity/services/storeSession), which checks the role and records the reason
      name: 'storeSession',
      label: 'Store session',
      type: 'group',
      admin: { hidden: true },
      access: { read: fieldPlatformStaffOnly, create: () => false, update: () => false },
      fields: [
        { name: 'tenant', type: 'relationship', relationTo: 'tenants' },
        {
          name: 'mode',
          type: 'select',
          options: STORE_SESSION_MODES.map((value) => ({
            value,
            label: STORE_SESSION_MODE_LABELS[value],
          })),
        },
        { name: 'reason', type: 'text' },
        { name: 'startedAt', type: 'date' },
        { name: 'endsAt', type: 'date' },
      ],
    },
  ],
  hooks: {
    beforeOperation: [
      // Enforce the password policy on create, update and the invite/reset link alike
      ({ args, operation }) => {
        if (operation === 'create' || operation === 'update' || operation === 'resetPassword') {
          const password: unknown = args.data?.password
          if (typeof password === 'string' && password.length < MIN_PASSWORD_LENGTH) {
            throw new APIError(
              `Use at least ${MIN_PASSWORD_LENGTH} characters for the password.`,
              400,
              undefined,
              true,
            )
          }
        }
        return args
      },
    ],
    beforeLogin: [
      ({ user }) => {
        if (user.status === 'disabled') {
          // Same wording as a wrong password: never reveal account state (docs/05)
          throw new APIError('The email or password provided is incorrect.', 401, undefined, true)
        }
      },
      // After the password matched: the authenticator code, on every way in (our sign-in page
      // passes it in the context; Payload's own login endpoint can't, so it is refused)
      ({ req, user }) => checkTwoStepAtSignIn(req, user),
    ],
    afterLogin: [
      async ({ req, user }) => {
        await req.payload.update({
          collection: 'users',
          id: user.id,
          data: {
            lastLoginAt: new Date().toISOString(),
            ...(user.status === 'invited' ? { status: 'active' } : {}),
          },
          overrideAccess: true,
          req,
          context: { skipAudit: true },
        })
      },
    ],
    afterOperation: [
      // Setting a password from the invite link activates the account
      async ({ operation, req, result }) => {
        if (operation !== 'resetPassword') return result
        const user = (
          result as
            | { user?: { id: string | number; status?: string; twoFactorEnabled?: boolean | null } }
            | undefined
        )?.user
        if (user?.twoFactorEnabled) {
          // A password reset signs the person in; with two-step on, that session is dropped so
          // they sign in again with their code (no way around the second step)
          await req.payload.db.updateOne({
            collection: 'users',
            where: { id: { equals: user.id } },
            data: { sessions: [] },
            req,
          })
        }
        if (user?.status === 'invited') {
          await req.payload.update({
            collection: 'users',
            id: user.id,
            data: { status: 'active' },
            overrideAccess: true,
            req,
            context: { skipAudit: true },
          })
        }
        return result
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req, context }) => {
        if (context.skipAudit || operation !== 'update') return
        const before = {
          platformRole: previousDoc?.platformRole ?? null,
          status: previousDoc?.status ?? null,
          tenants: JSON.stringify(previousDoc?.tenants ?? []),
        }
        const after = {
          platformRole: doc.platformRole ?? null,
          status: doc.status ?? null,
          tenants: JSON.stringify(doc.tenants ?? []),
        }
        if (JSON.stringify(before) === JSON.stringify(after)) return
        await recordAudit(req, {
          action: 'staff_changed',
          collectionSlug: 'users',
          docId: String(doc.id),
          diff: { before, after },
        })
      },
    ],
  },
}

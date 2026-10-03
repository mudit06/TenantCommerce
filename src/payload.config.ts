import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { resendAdapter } from '@payloadcms/email-resend'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { fieldSuperAdminOnly, isPlatformStaff, TENANT_ROLE_LABELS, TENANT_ROLES } from '@/access'
import { devLogEmailAdapter } from '@/lib/email/devLog'
import { env } from '@/lib/env'
import { AuditLogs } from '@/modules/audit'
import { identityEndpoints, Users } from '@/modules/identity'
import {
  checkSubscriptionsTask,
  FeatureFlags,
  Plans,
  Subscriptions,
  tenancyEndpoints,
  TenantDomains,
  Tenants,
} from '@/modules/tenancy'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Assembles collections, plugins, endpoints and jobs (docs/03). Module code stays in
// src/modules/*; this file only wires it together.
export default buildConfig({
  serverURL: env.ADMIN_URL,
  secret: env.PAYLOAD_SECRET,
  // Cookie sessions are accepted only from these origins (CSRF, docs/05). Locally the admin may be
  // opened at any of the usual loopback names; production allows the admin URL only.
  csrf:
    env.NODE_ENV === 'production'
      ? [env.ADMIN_URL]
      : [
          env.ADMIN_URL,
          'http://localhost:3000',
          'http://127.0.0.1:3000',
          'http://admin.localhost:3000',
        ],
  db: mongooseAdapter({
    url: env.DATABASE_URI,
    // Wait for index builds before the first writes (avoids lock timeouts on a fresh database).
    // Production creates indexes in migrations instead (docs/15).
    ensureIndexes: env.NODE_ENV !== 'production',
  }),
  editor: lexicalEditor(),
  sharp,
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: {
      titleSuffix: ' · TenantEcom admin',
      icons: [{ rel: 'icon', type: 'image/svg+xml', url: '/favicon.svg' }],
    },
    components: {
      graphics: {
        Logo: '@/admin/graphics/Logo#Logo',
        Icon: '@/admin/graphics/Icon#Icon',
      },
      afterNavLinks: ['@/admin/nav/PlatformNavLinks#PlatformNavLinks'],
      views: {
        dashboard: { Component: '@/admin/views/Dashboard#Dashboard' },
        newVendor: {
          Component: '@/modules/tenancy/admin/views/NewVendorView#NewVendorView',
          path: '/vendors/new',
          meta: { title: 'New vendor' },
        },
        team: {
          Component: '@/modules/identity/admin/TeamView#TeamView',
          path: '/team',
          meta: { title: 'Team and access' },
        },
      },
    },
    dateFormat: 'd MMM yyyy, HH:mm',
    // Built-in avatar: Gravatar would send hashed staff emails to a third party (docs/14)
    avatar: 'default',
  },
  collections: [Tenants, TenantDomains, Plans, Subscriptions, FeatureFlags, Users, AuditLogs],
  endpoints: [...tenancyEndpoints, ...identityEndpoints],
  jobs: {
    tasks: [checkSubscriptionsTask],
    // Long-running servers (local, Docker) run the queue themselves; on Vercel a cron hits
    // /api/payload-jobs/run instead (docs/15)
    autoRun: process.env.VERCEL ? undefined : [{ cron: '0 */5 * * * *', queue: 'scheduled' }],
    jobsCollectionOverrides: ({ defaultJobsCollection }) => ({
      ...defaultJobsCollection,
      admin: { ...defaultJobsCollection.admin, group: false },
    }),
  },
  email: env.RESEND_API_KEY
    ? resendAdapter({
        apiKey: env.RESEND_API_KEY,
        defaultFromAddress: env.EMAIL_FROM_ADDRESS,
        defaultFromName: env.EMAIL_FROM_NAME,
      })
    : devLogEmailAdapter({ fromAddress: env.EMAIL_FROM_ADDRESS, fromName: env.EMAIL_FROM_NAME }),
  plugins: [
    multiTenantPlugin({
      tenantsSlug: 'tenants',
      // Tenant-scoped collections that use the plugin's tenant field (docs/04). Platform
      // collections (subscriptions, tenant-domains, audit-logs) carry their own `tenant`
      // relationship and their own access rules.
      collections: {
        'feature-flags': {},
      },
      // Our team works across stores; support is read-only through access functions
      userHasAccessToAllTenants: (user) => isPlatformStaff(user),
      tenantsArrayField: {
        includeDefaultField: true,
        // Store memberships are changed by super admins only (the plugin default would also let
        // support edit them, including on their own account); owners go through invites
        arrayFieldAccess: { create: fieldSuperAdminOnly, update: fieldSuperAdminOnly },
        rowFields: [
          {
            name: 'roles',
            type: 'select',
            hasMany: true,
            required: true,
            defaultValue: ['owner'],
            options: TENANT_ROLES.map((value) => ({ value, label: TENANT_ROLE_LABELS[value] })),
          },
        ],
      },
      i18n: { translations: { en: { 'nav-tenantSelector-label': 'Store' } } },
      // Stores are archived, never cascade-deleted from the admin (docs/04)
      cleanupAfterTenantDelete: false,
    }),
  ],
})

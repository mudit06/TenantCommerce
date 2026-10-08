import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { resendAdapter } from '@payloadcms/email-resend'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import { nestedDocsPlugin } from '@payloadcms/plugin-nested-docs'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import { buildConfig, type CollectionConfig } from 'payload'
import sharp from 'sharp'

import { fieldSuperAdminOnly, isPlatformStaff, TENANT_ROLE_LABELS, TENANT_ROLES } from '@/access'
import { platformScreen, storeScreen } from '@/admin/workspace'
import { ConnectorConfigs, connectorEndpoints } from '@/connectors'
import { withStorefrontRevalidation } from '@/hooks/revalidateStorefront'
import { withStoreSessionAudit } from '@/hooks/storeSessionAudit'
import { devLogEmailAdapter } from '@/lib/email/devLog'
import { env } from '@/lib/env'
import { AuditLogs } from '@/modules/audit'
import {
  AttributeSets,
  Brands,
  catalogEndpoints,
  Categories,
  ProductDocuments,
  Products,
  Variants,
} from '@/modules/catalog'
import {
  Banners,
  Media,
  Navigation,
  Pages,
  registerContentEvents,
  SiteSettings,
} from '@/modules/content'
import {
  Addresses,
  cleanupCustomerAuthTask,
  customerEndpoints,
  Customers,
  CustomerSessions,
  LoginCodes,
  PrivacyRequests,
  registerCustomerEvents,
} from '@/modules/customers'
import { Dealers } from '@/modules/dealers'
import { Enquiries } from '@/modules/enquiries'
import { identityEndpoints, Users } from '@/modules/identity'
import { Carts } from '@/modules/cart'
// Endpoints load env; the job reads the orders module, which reads the cart module: both wired
// here, not through the cart index
import { cartEndpoints } from '@/modules/cart/endpoints'
import { abandonedCartsTask } from '@/modules/cart/jobs/abandoned'
import { StockMovements } from '@/modules/inventory'
import {
  IdempotencyKeys,
  orderEndpoints,
  OrderEvents,
  Orders,
  retrackParcelsTask,
} from '@/modules/orders'
import {
  cleanupNotificationLogsTask,
  ContactPreferences,
  NotificationLogs,
  NotificationSettings,
  NotificationTemplates,
  OfferCampaigns,
  registerNotificationEvents,
  sendCampaignsTask,
  sendNotificationTask,
} from '@/modules/notifications'
// Endpoints load env and connectors, like the shipping ones below
import { notificationEndpoints } from '@/modules/notifications/endpoints'
import { paymentEndpoints, reconcilePaymentsTask, Refunds, Transactions } from '@/modules/payments'
import {
  CouponRedemptions,
  Coupons,
  promotionEndpoints,
  registerPromotionEvents,
  schemeStatsTask,
  Schemes,
  switchSchemesTask,
} from '@/modules/promotions'
import { reviewEndpoints, reviewRequestsTask, Reviews, Wishlists } from '@/modules/reviews'
import { Pincodes, Shipments, ShippingZones } from '@/modules/shipping'
// Endpoints load env and connectors; kept out of the shipping index so its pure parts stay
// importable from unit-tested code (orders' parcel rules)
import { shippingEndpoints } from '@/modules/shipping/endpoints'
import { Counters, Invoices, registerTaxInvoicingEvents } from '@/modules/tax-invoicing'
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

// Modules seed their per-store data when a store is created (docs/01 events)
registerContentEvents()
registerTaxInvoicingEvents()
registerNotificationEvents()
registerCustomerEvents()
registerPromotionEvents()

/** A store's own data: its CMS screens only, and audited when our team changes it (docs/05). */
const storeCollection = (collection: CollectionConfig) =>
  withStoreSessionAudit(storeScreen(collection))

/** Largest upload Payload accepts (PDF catalogues); images are capped lower in media hooks. */
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024

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
      // One menu per workspace: the platform panel or a store's CMS (src/admin/nav)
      Nav: '@/admin/nav/AppNav#AppNav',
      // A store CMS's top bar from the wireframe: search, View store, enquiry bell, who is signed in
      actions: ['@/admin/header/StoreTopBar#StoreTopBar'],
      header: [
        // "You are managing <store> as platform admin" on every page of a store session (docs/05)
        '@/admin/session/StoreSessionBanner#StoreSessionBanner',
        // Suspended store or maintenance mode: on every page of a store's CMS
        '@/admin/header/StoreBanner#StoreBanner',
        // Descriptions under each block in the page builder's "Add block" library
        '@/blocks/admin/BlockLibraryHints#BlockLibraryHints',
      ],
      views: {
        dashboard: { Component: '@/admin/views/Dashboard#Dashboard' },
        newPage: {
          Component: '@/modules/content/admin/NewPageView#NewPageView',
          path: '/new-page',
          meta: { title: 'Create a page' },
        },
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
        payments: {
          Component: '@/connectors/admin/PaymentsView#PaymentsView',
          path: '/payments',
          meta: { title: 'Payments' },
        },
        shipping: {
          Component: '@/modules/shipping/admin/ShippingView#ShippingView',
          path: '/shipping',
          meta: { title: 'Shipping zones' },
        },
        orderUpdates: {
          Component: '@/modules/notifications/admin/OrderUpdatesView#OrderUpdatesView',
          path: '/order-updates',
          meta: { title: 'Order updates' },
        },
        messaging: {
          Component: '@/connectors/admin/MessagingView#MessagingView',
          path: '/messaging',
          meta: { title: 'WhatsApp and SMS' },
        },
        storeStaff: {
          Component: '@/modules/identity/admin/StoreStaffView#StoreStaffView',
          path: '/staff',
          meta: { title: 'Staff and roles' },
        },
      },
    },
    dateFormat: 'd MMM yyyy, HH:mm',
    // Built-in avatar: Gravatar would send hashed staff emails to a third party (docs/14)
    avatar: 'default',
  },
  collections: [
    // Store content and catalog (tenant-scoped, docs/04). Changes clear the store's cached pages.
    // Shown in a store's CMS only; our team opens them through a store session (docs/05).
    ...[
      SiteSettings,
      Products,
      Variants,
      Categories,
      AttributeSets,
      Brands,
      ProductDocuments,
      Media,
      Pages,
      Navigation,
      Banners,
      Dealers,
    ].map((collection) => storeCollection(withStorefrontRevalidation(collection))),
    storeCollection(Enquiries),
    // Growth (stage C): schemes are edited in Payload's form; coupons through their own screen.
    // Both change store prices, so they clear the store's cached pages
    storeCollection(withStorefrontRevalidation(Schemes)),
    storeCollection(withStorefrontRevalidation(Coupons)),
    storeScreen(CouponRedemptions),
    // Reviews are moderated through their own screen; wishlists belong to shoppers
    ...[Reviews, Wishlists].map(storeScreen),
    storeScreen(OfferCampaigns),
    // Selling (stage B): orders and their records are written by services only, so the store
    // session audit wrapper is for the screens staff edit directly (shipping zones)
    storeCollection(ShippingZones),
    ...[Orders, OrderEvents, Transactions, Refunds, Invoices, Shipments, Carts, StockMovements].map(
      storeScreen,
    ),
    // Order updates (docs/18): settings and templates through their own screens, logs and
    // preferences written by the notifications module only
    ...[NotificationSettings, NotificationTemplates, NotificationLogs, ContactPreferences].map(
      storeScreen,
    ),
    // Shopper accounts (ADR 0003): staff add notes or block an account; the rest is written by
    // the customers module from the storefront
    storeCollection(Customers),
    ...[Addresses, CustomerSessions, LoginCodes, PrivacyRequests].map(storeScreen),
    IdempotencyKeys,
    Pincodes,
    Counters,
    // Written only by the connector service (encrypts secrets, audits each change)
    ConnectorConfigs,
    // Platform panel only. Feature switches are kept by both: the vendor's Features tab and the
    // store's own feature screens (they have no menu entry of their own)
    ...[Tenants, TenantDomains, Plans, Subscriptions].map(platformScreen),
    FeatureFlags,
    ...[Users, AuditLogs].map(platformScreen),
  ],
  upload: { limits: { fileSize: MAX_UPLOAD_BYTES } },
  endpoints: [
    ...tenancyEndpoints,
    ...identityEndpoints,
    ...catalogEndpoints,
    ...connectorEndpoints,
    ...paymentEndpoints,
    ...orderEndpoints,
    ...shippingEndpoints,
    ...notificationEndpoints,
    ...cartEndpoints,
    ...customerEndpoints,
    ...promotionEndpoints,
    ...reviewEndpoints,
  ],
  jobs: {
    tasks: [
      checkSubscriptionsTask,
      reconcilePaymentsTask,
      retrackParcelsTask,
      sendNotificationTask,
      cleanupNotificationLogsTask,
      cleanupCustomerAuthTask,
      switchSchemesTask,
      schemeStatsTask,
      reviewRequestsTask,
      sendCampaignsTask,
      abandonedCartsTask,
    ],
    // Long-running servers (local, Docker) run the queue themselves; on Vercel a cron hits
    // /api/payload-jobs/run instead (docs/15). `default` runs scheduled page publishing and
    // shopper messages. Tests run jobs by hand.
    autoRun:
      process.env.VERCEL || process.env.NODE_ENV === 'test'
        ? undefined
        : [
            { cron: '0 */5 * * * *', queue: 'scheduled' },
            { cron: '0 * * * * *', queue: 'default' },
          ],
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
    // Category tree: parent and breadcrumbs (/c/<parent>/<child>, docs/13)
    nestedDocsPlugin({
      collections: ['categories'],
      generateLabel: (_, doc) => String(doc.name ?? ''),
      generateURL: (docs) => `/c/${docs.map((doc) => doc.slug).join('/')}`,
    }),
    // Media files go to S3-compatible object storage (Cloudflare R2 or S3) when a bucket is set,
    // and are served from its CDN domain; without one they stay on local disk (development).
    // The database only ever holds file metadata (docs/12 "Media").
    s3Storage({
      enabled: Boolean(env.S3_BUCKET),
      bucket: env.S3_BUCKET ?? '',
      collections: {
        media: {
          prefix: 'media',
          ...(env.MEDIA_PUBLIC_URL
            ? {
                disablePayloadAccessControl: true,
                generateFileURL: ({ filename, prefix }) =>
                  [env.MEDIA_PUBLIC_URL?.replace(/\/$/, ''), prefix, filename]
                    .filter(Boolean)
                    .join('/'),
              }
            : {}),
        },
      },
      // Browser uploads straight to the bucket: Vercel caps request bodies at 4.5 MB
      clientUploads: env.S3_CLIENT_UPLOADS,
      config: {
        endpoint: env.S3_ENDPOINT,
        region: env.S3_REGION,
        credentials:
          env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
            ? { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY }
            : undefined,
      },
    }),
    multiTenantPlugin({
      tenantsSlug: 'tenants',
      // Tenant-scoped collections that use the plugin's tenant field (docs/04). Platform
      // collections (subscriptions, tenant-domains, audit-logs) carry their own `tenant`
      // relationship and their own access rules.
      collections: {
        'feature-flags': {},
        // One per store: the menu opens the store's document directly
        'site-settings': { isGlobal: true },
        navigation: { isGlobal: true },
        products: {},
        variants: {},
        categories: {},
        'attribute-sets': {},
        brands: {},
        'product-documents': {},
        media: {},
        pages: {},
        banners: {},
        enquiries: {},
        dealers: {},
        counters: {},
        'connector-configs': {},
        'shipping-zones': {},
        orders: {},
        'order-events': {},
        transactions: {},
        refunds: {},
        invoices: {},
        shipments: {},
        carts: {},
        'stock-movements': {},
        'idempotency-keys': {},
        'notification-settings': { isGlobal: true },
        'notification-templates': {},
        'notification-logs': {},
        'contact-preferences': {},
        customers: {},
        addresses: {},
        'customer-sessions': {},
        'login-codes': {},
        'privacy-requests': {},
        schemes: {},
        coupons: {},
        'coupon-redemptions': {},
        reviews: {},
        wishlists: {},
        'offer-campaigns': {},
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

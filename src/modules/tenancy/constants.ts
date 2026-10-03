export const TENANT_STATUSES = ['draft', 'active', 'suspended', 'archived'] as const
export type TenantStatus = (typeof TENANT_STATUSES)[number]

/** Allowed store status moves (docs/04 tenant lifecycle). */
export const TENANT_TRANSITIONS: Record<TenantStatus, readonly TenantStatus[]> = {
  draft: ['active', 'archived'],
  active: ['suspended', 'archived'],
  suspended: ['active', 'archived'],
  archived: [],
}

export const INDUSTRIES = [
  { value: 'sanitary', label: 'Sanitary ware' },
  { value: 'locks', label: 'Locks' },
  { value: 'hardware', label: 'Door and furniture hardware' },
  { value: 'decor', label: 'Home decor' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'other', label: 'Other' },
] as const
export type Industry = (typeof INDUSTRIES)[number]['value']

export const SUBSCRIPTION_STATUSES = [
  'trialing',
  'active',
  'past_due',
  'cancelled',
  'paused',
] as const
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]

export const BILLING_MODES = ['manual', 'razorpay'] as const
export const BILLING_CYCLES = ['monthly', 'yearly'] as const
export type BillingCycle = (typeof BILLING_CYCLES)[number]

export const PAYMENT_METHODS = [
  { value: 'neft', label: 'NEFT / RTGS' },
  { value: 'imps', label: 'IMPS' },
  { value: 'upi', label: 'UPI' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'card', label: 'Card' },
] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value']

export const DOMAIN_TYPES = ['subdomain', 'custom'] as const
export const SSL_STATUSES = ['pending', 'issuing', 'active', 'failed'] as const

/** Slugs that can never name a store: they collide with routes or platform hosts (docs/01). */
export const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  '_next',
  'platform',
  'www',
  'app',
  'static',
  'assets',
  'cdn',
  'media',
  'mail',
  'email',
  'status',
  'help',
  'support',
  'docs',
  'staging',
  'test',
  'demo',
  'default',
  '_template',
])

/** Usage share at which a store is flagged on the dashboard and warned in its CMS. */
export const USAGE_WARNING_RATIO = 0.9

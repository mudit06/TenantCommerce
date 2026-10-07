// Shopper accounts (docs/05 "customers", ADR 0003): limits and labels shared by the services,
// the storefront and the Customers screen.

export const SESSION_COOKIE = 'te_sid'
export const SESSION_DAYS = 30
/** A session is pushed back to 30 days at most once a day, so reads stay reads */
export const SESSION_TOUCH_MS = 24 * 60 * 60 * 1000

export const CODE_MINUTES = 10
export const CODE_TRIES = 5
/** Wait before another code can be sent to the same email */
export const CODE_RESEND_SECONDS = 30

export const PASSWORD_MIN = 10
export const MAX_ADDRESSES = 10

export const CUSTOMER_ROLES = [{ value: 'affiliate', label: 'Affiliate' }] as const
export type CustomerRole = (typeof CUSTOMER_ROLES)[number]['value']

export const CUSTOMER_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'blocked', label: 'Blocked' },
] as const

export const ADDRESS_TYPES = [
  { value: 'home', label: 'Home' },
  { value: 'work', label: 'Work' },
  { value: 'site', label: 'Site' },
] as const

export const PRIVACY_TYPES = [
  { value: 'export', label: 'Data export' },
  { value: 'correction', label: 'Correction' },
  { value: 'deletion', label: 'Delete account' },
] as const

export const PRIVACY_STATUSES = [
  { value: 'received', label: 'Received' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
  { value: 'rejected', label: 'Rejected' },
] as const

/** Days to answer a privacy request (docs/06; confirm with the lawyer review in docs/14) */
export const PRIVACY_DUE_DAYS = 30

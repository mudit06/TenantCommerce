export const AUDIT_ACTIONS = [
  'support_access',
  'store_created',
  'store_status_changed',
  'feature_changed',
  'connector_changed',
  'plan_changed',
  'plan_edited',
  'subscription_payment',
  'subscription_status_changed',
  'staff_invited',
  'staff_changed',
  'two_factor_reset',
  'domain_changed',
  'price_changed',
  'refund',
  'scheme_changed',
  'coupon_changed',
  'commission_changed',
  'affiliate_payout',
  'review_moderated',
] as const

export type AuditAction = (typeof AUDIT_ACTIONS)[number]

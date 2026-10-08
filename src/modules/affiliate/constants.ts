// Affiliates (docs/11 "Affiliate commissions", docs/screens Affiliates)

export const AFFILIATE_STATUSES = [
  { value: 'applied', label: 'Applied' },
  { value: 'approved', label: 'Approved' },
  { value: 'paused', label: 'Paused' },
  { value: 'rejected', label: 'Rejected' },
] as const
export type AffiliateStatus = (typeof AFFILIATE_STATUSES)[number]['value']

export const PROMOTES_ON = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'website', label: 'Website or blog' },
  { value: 'whatsapp', label: 'WhatsApp groups' },
  { value: 'offline', label: 'In person (fitter, contractor)' },
  { value: 'other', label: 'Somewhere else' },
] as const

export const REFERRAL_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
  { value: 'reversed', label: 'Reversed' },
] as const
export type ReferralStatus = (typeof REFERRAL_STATUSES)[number]['value']

export const PAYOUT_METHODS = [
  { value: 'upi', label: 'UPI' },
  { value: 'neft', label: 'NEFT' },
  { value: 'imps', label: 'IMPS' },
] as const

/** The referral cookie: the affiliate's code, last click wins */
export const REF_COOKIE = 'te_ref'

/**
 * Commission TDS (Income-tax Act 2025 s.393(1), formerly s.194H; docs/11): once an affiliate's
 * commission from the store passes ₹20,000 in a financial year, 2% on the whole year's amount,
 * 20% without a PAN. The CA confirms before launch.
 */
export const TDS_THRESHOLD_MINOR = 20_000_00
export const TDS_PERCENT_WITH_PAN = 2
export const TDS_PERCENT_WITHOUT_PAN = 20

// Reviews and wishlists (docs/06, docs/screens Reviews, Write a review, Wishlist).

export const REVIEW_STATUSES = [
  { value: 'pending', label: 'To approve' },
  { value: 'published', label: 'Published' },
  { value: 'rejected', label: 'Rejected' },
] as const
export type ReviewStatus = (typeof REVIEW_STATUSES)[number]['value']

/** The only reasons to reject: never a low rating (docs/screens Reviews rule 2, docs/14) */
export const REJECTION_REASONS = [
  { value: 'abuse', label: 'Abuse' },
  { value: 'personal-data', label: 'Personal details' },
  { value: 'not-about-product', label: 'Not about the product' },
  { value: 'spam', label: 'Spam' },
  { value: 'duplicate', label: 'Duplicate' },
] as const
export type RejectionReason = (typeof REJECTION_REASONS)[number]['value']

export const MAX_PHOTOS = 4
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024
/** A review link in the request email works this long */
export const REVIEW_LINK_DAYS = 90
export const MAX_WISHLIST = 100

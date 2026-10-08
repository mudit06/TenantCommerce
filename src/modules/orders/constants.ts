// Order statuses (docs/11 "Order lifecycle"). Order, payment and delivery are separate fields
// so "paid but not shipped" and "shipped, COD to collect" are both clear at a glance.

export const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending payment' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]['value']

export const PAYMENT_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'authorized', label: 'Authorised' },
  { value: 'paid', label: 'Paid' },
  { value: 'partially_refunded', label: 'Partly refunded' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'failed', label: 'Failed' },
] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]['value']

export const FULFILLMENT_STATUSES = [
  { value: 'unfulfilled', label: 'Not shipped' },
  { value: 'packed', label: 'Packed' },
  { value: 'partially_shipped', label: 'Partly shipped' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'out_for_delivery', label: 'Out for delivery' },
  { value: 'delivery_failed', label: 'Delivery failed' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'rto', label: 'Returning to you' },
  { value: 'lost', label: 'Lost' },
  { value: 'returned', label: 'Returned' },
  { value: 'cancelled', label: 'Cancelled' },
] as const
export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number]['value']

export const PAYMENT_METHODS = [
  { value: 'razorpay', label: 'Paid online' },
  { value: 'cod', label: 'Cash on delivery' },
] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value']

export const ORDER_EVENT_TYPES = [
  'created',
  'payment_captured',
  'payment_failed',
  'status_changed',
  'parcel_status_changed',
  'note',
  'refund',
  'invoice',
  'message_sent',
  'shopper_reply',
  'return',
] as const
export type OrderEventType = (typeof ORDER_EVENT_TYPES)[number]

/** A Razorpay order not paid in this time is cancelled and its stock released (docs/11) */
export const PENDING_PAYMENT_MINUTES = 30

export const label = <T extends string>(
  list: readonly { value: T; label: string }[],
  value: string | null | undefined,
) => list.find((item) => item.value === value)?.label ?? value ?? ''

/** Returns (docs/11 "Returns and exchanges", docs/screens storefront `st-order`) */
export const RETURN_REASONS = [
  { value: 'damaged', label: 'Arrived damaged or broken' },
  { value: 'wrong-item', label: 'Wrong item or finish' },
  { value: 'not-as-described', label: 'Not as described' },
  { value: 'size-fit', label: 'Size or fit' },
  { value: 'changed-mind', label: 'Changed my mind' },
  { value: 'other', label: 'Something else' },
] as const

export const RETURN_STATUSES = [
  { value: 'requested', label: 'Return requested' },
  { value: 'approved', label: 'Return approved' },
  { value: 'rejected', label: 'Return rejected' },
  { value: 'received', label: 'Returned to the store' },
  { value: 'refunded', label: 'Refunded' },
] as const
export type ReturnStatus = (typeof RETURN_STATUSES)[number]['value']

/** Statuses of a return still being handled */
export const OPEN_RETURN: readonly ReturnStatus[] = ['requested', 'approved', 'received']

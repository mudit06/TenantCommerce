// The parcel journey (docs/11 "Parcel journey"). A parcel's status is what the shopper is told.

export const SHIPMENT_STATUSES = [
  { value: 'packed', label: 'Packed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'in_transit', label: 'In transit' },
  { value: 'out_for_delivery', label: 'Out for delivery' },
  { value: 'delivery_failed', label: 'Delivery failed' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'rto_initiated', label: 'Returning to you' },
  { value: 'rto_delivered', label: 'Returned to you' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'lost', label: 'Lost' },
] as const
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number]['value']

export const FAILURE_REASONS = [
  { value: 'customer_unavailable', label: 'Shopper not available' },
  { value: 'address_issue', label: 'Address problem' },
  { value: 'refused', label: 'Shopper refused it' },
  { value: 'cod_not_ready', label: 'Cash not ready' },
  { value: 'other', label: 'Other' },
] as const
export type FailureReason = (typeof FAILURE_REASONS)[number]['value']

export const RATE_TYPES = [
  { value: 'flat', label: 'Flat' },
  { value: 'weight', label: 'Weight' },
  { value: 'order-value', label: 'Order value' },
] as const
export type RateType = (typeof RATE_TYPES)[number]['value']

/** Parcels worth more than this need an e-way bill number before pickup (docs/09) */
export const EWAY_BILL_ABOVE_MINOR = 50_000_00

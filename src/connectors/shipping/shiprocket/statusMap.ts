// Shiprocket's tracking statuses to our parcel journey (docs/09 "Status map"). Pickup steps
// keep the parcel packed; pickup problems keep it packed and alert staff; unknown statuses are
// ignored (and logged by the caller).

export type MappedStatus =
  | {
      to:
        | 'shipped'
        | 'in_transit'
        | 'out_for_delivery'
        | 'delivered'
        | 'rto_initiated'
        | 'rto_delivered'
        | 'cancelled'
        | 'lost'
    }
  | {
      to: 'delivery_failed'
      reason: 'customer_unavailable' | 'address_issue' | 'refused' | 'cod_not_ready' | 'other'
    }
  | { to: null; alert?: string }

const normalize = (status: string) =>
  status.trim().toUpperCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')

const STAY_PACKED = [
  'NEW',
  'AWB ASSIGNED',
  'LABEL GENERATED',
  'PICKUP SCHEDULED',
  'PICKUP GENERATED',
  'PICKUP QUEUED',
  'MANIFEST GENERATED',
  'OUT FOR PICKUP',
  'READY TO SHIP',
]

/** Words in an undelivered scan that tell us why (Shiprocket NDR reasons are free text) */
function failureReason(
  activity: string,
): 'customer_unavailable' | 'address_issue' | 'refused' | 'cod_not_ready' | 'other' {
  const text = activity.toLowerCase()
  if (/refus|reject|not interested|cancel/.test(text)) return 'refused'
  if (/cash|cod|amount/.test(text)) return 'cod_not_ready'
  if (/address|incomplete|wrong|landmark|locat/.test(text)) return 'address_issue'
  if (/unavailable|not available|door ?lock|not reachable|no response|consignee/.test(text))
    return 'customer_unavailable'
  return 'other'
}

export function mapShiprocketStatus(status: string, activity = ''): MappedStatus {
  const s = normalize(status)
  if (!s) return { to: null }
  if (STAY_PACKED.includes(s)) return { to: null }
  if (
    s.startsWith('PICKUP EXCEPTION') ||
    s.startsWith('PICKUP RESCHEDULED') ||
    s === 'PICKUP ERROR'
  ) {
    return { to: null, alert: `Shiprocket pickup problem: ${status}` }
  }
  if (s.startsWith('RTO DELIVERED')) return { to: 'rto_delivered' }
  if (s.startsWith('RTO')) return { to: 'rto_initiated' }
  if (s === 'DELIVERED') return { to: 'delivered' }
  if (s === 'OUT FOR DELIVERY') return { to: 'out_for_delivery' }
  if (s.startsWith('UNDELIVERED') || s === 'NDR')
    return { to: 'delivery_failed', reason: failureReason(activity) }
  if (s === 'PICKED UP' || s === 'SHIPPED') return { to: 'shipped' }
  if (
    s === 'IN TRANSIT' ||
    s.startsWith('REACHED') ||
    s === 'MISROUTED' ||
    s.startsWith('IN TRANSIT')
  )
    return { to: 'in_transit' }
  if (s === 'CANCELED' || s === 'CANCELLED') return { to: 'cancelled' }
  if (s === 'LOST' || s === 'DAMAGED' || s === 'DESTROYED' || s === 'DISPOSED OFF')
    return { to: 'lost' }
  return { to: null }
}

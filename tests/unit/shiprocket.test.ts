import { describe, expect, it } from 'vitest'

import { mapShiprocketStatus } from '@/connectors/shipping/shiprocket/statusMap'

describe('Shiprocket status map', () => {
  it('moves the parcel along the journey', () => {
    expect(mapShiprocketStatus('PICKED UP')).toEqual({ to: 'shipped' })
    expect(mapShiprocketStatus('In Transit')).toEqual({ to: 'in_transit' })
    expect(mapShiprocketStatus('REACHED AT DESTINATION HUB')).toEqual({ to: 'in_transit' })
    expect(mapShiprocketStatus('OUT FOR DELIVERY')).toEqual({ to: 'out_for_delivery' })
    expect(mapShiprocketStatus('DELIVERED')).toEqual({ to: 'delivered' })
    expect(mapShiprocketStatus('RTO INITIATED')).toEqual({ to: 'rto_initiated' })
    expect(mapShiprocketStatus('RTO IN TRANSIT')).toEqual({ to: 'rto_initiated' })
    expect(mapShiprocketStatus('RTO_DELIVERED')).toEqual({ to: 'rto_delivered' })
    expect(mapShiprocketStatus('LOST')).toEqual({ to: 'lost' })
    expect(mapShiprocketStatus('CANCELED')).toEqual({ to: 'cancelled' })
  })
  it('reads why a delivery failed', () => {
    expect(mapShiprocketStatus('UNDELIVERED', 'Consignee not available')).toEqual({
      to: 'delivery_failed',
      reason: 'customer_unavailable',
    })
    expect(mapShiprocketStatus('UNDELIVERED', 'Customer refused to accept')).toEqual({
      to: 'delivery_failed',
      reason: 'refused',
    })
    expect(mapShiprocketStatus('UNDELIVERED', 'Incomplete address')).toEqual({
      to: 'delivery_failed',
      reason: 'address_issue',
    })
    expect(mapShiprocketStatus('UNDELIVERED', 'COD amount not ready')).toEqual({
      to: 'delivery_failed',
      reason: 'cod_not_ready',
    })
  })
  it('keeps pickup steps packed and flags pickup problems', () => {
    expect(mapShiprocketStatus('PICKUP SCHEDULED')).toEqual({ to: null })
    expect(mapShiprocketStatus('PICKUP EXCEPTION')).toMatchObject({
      to: null,
      alert: expect.stringContaining('pickup'),
    })
    expect(mapShiprocketStatus('SOMETHING NEW')).toEqual({ to: null })
  })
})

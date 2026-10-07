import { providerFetch } from '../../core/http'
import type { ConnectorContext, ConnectorImplementation, TestResult } from '../../core/types'

// Shiprocket on the vendor's own account (docs/09 "Shiprocket"). Shiprocket takes kg, cm and
// rupees: convert from our grams, mm and paise in this folder only.

export const SHIPROCKET_API = 'https://apiv2.shiprocket.in/v1/external'

type LoginResponse = { token?: string; message?: string }
type PickupResponse = { data?: { shipping_address?: { pickup_location?: string }[] } }

// Login tokens last 240 hours; reuse one for 9 days per store and account (docs/09)
const TOKEN_DAYS = 9
const tokens = new Map<string, { token: string; expires: number }>()
const tokenKey = (ctx: ConnectorContext) => `${ctx.tenantId}:${ctx.secret.apiEmail ?? ''}`

export class ShiprocketError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ShiprocketError'
  }
}

export async function login(ctx: ConnectorContext, { fresh = false } = {}): Promise<string | null> {
  const cached = tokens.get(tokenKey(ctx))
  if (cached && !fresh && cached.expires > Date.now()) return cached.token
  const response = await providerFetch<LoginResponse>(`${SHIPROCKET_API}/auth/login`, {
    provider: 'Shiprocket',
    method: 'POST',
    body: { email: ctx.secret.apiEmail, password: ctx.secret.apiPassword },
    fetchImpl: ctx.fetchImpl,
  })
  const token = response.ok && response.json?.token ? response.json.token : null
  if (token) tokens.set(tokenKey(ctx), { token, expires: Date.now() + TOKEN_DAYS * 86_400_000 })
  return token
}

/** An authenticated call; a 401 logs in again once (the token may have been revoked). */
async function call<T>(
  ctx: ConnectorContext,
  path: string,
  init: { method?: 'GET' | 'POST'; body?: unknown } = {},
): Promise<{ ok: boolean; status: number; json: T | null }> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const token = await login(ctx, { fresh: attempt > 0 })
    if (!token)
      throw new ShiprocketError('Shiprocket refused the API user. Check it on Shipping.', 401)
    const response = await providerFetch<T>(`${SHIPROCKET_API}${path}`, {
      provider: 'Shiprocket',
      method: init.method ?? 'GET',
      headers: { Authorization: `Bearer ${token}` },
      body: init.body,
      fetchImpl: ctx.fetchImpl,
    })
    if (response.status !== 401) return response
  }
  throw new ShiprocketError('Shiprocket refused the API user. Check it on Shipping.', 401)
}

async function testCredentials(ctx: ConnectorContext): Promise<TestResult> {
  tokens.delete(tokenKey(ctx))
  const token = await login(ctx)
  if (!token) {
    return {
      ok: false,
      message:
        'Shiprocket refused the API user email and password. Check them under Settings, API in Shiprocket.',
    }
  }
  const pickups = await providerFetch<PickupResponse>(`${SHIPROCKET_API}/settings/company/pickup`, {
    provider: 'Shiprocket',
    headers: { Authorization: `Bearer ${token}` },
    fetchImpl: ctx.fetchImpl,
  })
  const names = (pickups.json?.data?.shipping_address ?? [])
    .map((row) => row.pickup_location)
    .filter((name): name is string => Boolean(name))
  const wanted = ctx.public.pickupLocation ?? ''
  if (pickups.ok && names.length && !names.includes(wanted)) {
    return {
      ok: false,
      message: `Signed in, but Shiprocket has no pickup location named “${wanted}”. Yours: ${names.join(', ')}.`,
    }
  }
  return { ok: true, message: 'Shiprocket accepted the API user and found the pickup location.' }
}

// ---- Serviceability and rates ----------------------------------------------------------

type Courier = {
  courier_company_id: number
  courier_name: string
  rate: number
  cod: number
  estimated_delivery_days?: string | number
  etd?: string
  rating?: number
}
type ServiceabilityResponse = {
  status?: number
  data?: { available_courier_companies?: Courier[]; recommended_courier_company_id?: number }
}

export type CourierOption = {
  courierId: string
  name: string
  rateMinor: number
  cod: boolean
  etaDays: number | null
}

export type Serviceability = {
  serviceable: boolean
  codAvailable: boolean
  /** The courier Shiprocket recommends (the vendor's priority), else the cheapest */
  best: CourierOption | null
  couriers: CourierOption[]
}

const toPaise = (rupees: number) => Math.round(rupees * 100)

/** Can a parcel go from the pickup pincode to `toPincode`, at what rate, how fast, COD? */
export async function checkServiceability(
  ctx: ConnectorContext,
  input: { toPincode: string; weightGrams: number; cod: boolean; declaredValueMinor: number },
): Promise<Serviceability> {
  const params = new URLSearchParams({
    pickup_postcode: ctx.public.pickupPincode ?? '',
    delivery_postcode: input.toPincode,
    // kg, at least 0.1
    weight: String(Math.max(0.1, input.weightGrams / 1000)),
    cod: input.cod ? '1' : '0',
    declared_value: String(Math.round(input.declaredValueMinor / 100)),
  })
  const response = await call<ServiceabilityResponse>(ctx, `/courier/serviceability/?${params}`)
  const list = response.json?.data?.available_courier_companies ?? []
  const couriers: CourierOption[] = list.map((courier) => ({
    courierId: String(courier.courier_company_id),
    name: courier.courier_name,
    rateMinor: toPaise(Number(courier.rate) || 0),
    cod: courier.cod === 1,
    etaDays: Number(courier.estimated_delivery_days) || null,
  }))
  const recommended = String(response.json?.data?.recommended_courier_company_id ?? '')
  const best =
    couriers.find((courier) => courier.courierId === recommended) ??
    [...couriers].sort((a, b) => a.rateMinor - b.rateMinor)[0] ??
    null
  return {
    serviceable: response.ok && couriers.length > 0,
    codAvailable: couriers.some((courier) => courier.cod),
    best,
    couriers,
  }
}

// ---- Booking a parcel --------------------------------------------------------------------

export type BookingInput = {
  orderNumber: string
  /** Our parcel id, so a parcel is never booked twice under one order number */
  parcelRef: string
  orderDate: Date
  billing: {
    name: string
    phone: string
    email: string
    line1: string
    line2?: string
    city: string
    state: string
    pincode: string
  }
  items: {
    name: string
    sku: string
    units: number
    sellingPriceMinor: number
    hsn?: string
    taxRate?: number
  }[]
  paymentMethod: 'prepaid' | 'cod'
  subTotalMinor: number
  package: { lengthMm: number; breadthMm: number; heightMm: number; weightGrams: number }
  courierId?: string
}

export type Booking = {
  providerOrderId: string
  providerShipmentId: string
  awb: string | null
  courierName: string | null
  courierId: string | null
  labelUrl: string | null
  pickupScheduledFor: string | null
  trackingUrl: string | null
}

type CreateOrderResponse = {
  order_id?: number
  shipment_id?: number
  status?: string
  message?: string
}
type AwbResponse = {
  awb_assign_status?: number
  response?: { data?: { awb_code?: string; courier_name?: string; courier_company_id?: number } }
  message?: string
}
type PickupResponseBody = { pickup_status?: number; response?: { pickup_scheduled_date?: string } }
type LabelResponse = { label_created?: number; label_url?: string }

const cm = (mm: number) => Math.max(1, Math.round(mm / 10))
const rupees = (minor: number) => Math.round(minor) / 100

export const trackingUrlFor = (awb: string) =>
  `https://shiprocket.co/tracking/${encodeURIComponent(awb)}`

/**
 * Packs on Shiprocket: creates the order, assigns the AWB (Shiprocket's courier priority, or the
 * courier staff chose), requests the pickup and makes the label (docs/09 table "Pack").
 */
export async function bookShipment(ctx: ConnectorContext, input: BookingInput): Promise<Booking> {
  const created = await call<CreateOrderResponse>(ctx, '/orders/create/adhoc', {
    method: 'POST',
    body: {
      order_id: `${input.orderNumber}-${input.parcelRef.slice(-6)}`,
      order_date: input.orderDate.toISOString().slice(0, 16).replace('T', ' '),
      pickup_location: ctx.public.pickupLocation,
      billing_customer_name: input.billing.name,
      billing_last_name: '',
      billing_address: input.billing.line1,
      billing_address_2: input.billing.line2 ?? '',
      billing_city: input.billing.city,
      billing_pincode: input.billing.pincode,
      billing_state: input.billing.state,
      billing_country: 'India',
      billing_email: input.billing.email,
      billing_phone: input.billing.phone.replace(/^\+91/, ''),
      shipping_is_billing: true,
      order_items: input.items.map((item) => ({
        name: item.name,
        sku: item.sku,
        units: item.units,
        selling_price: rupees(item.sellingPriceMinor),
        hsn: item.hsn ?? '',
        tax: item.taxRate ?? '',
      })),
      payment_method: input.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
      sub_total: rupees(input.subTotalMinor),
      length: cm(input.package.lengthMm),
      breadth: cm(input.package.breadthMm),
      height: cm(input.package.heightMm),
      weight: Math.max(0.1, input.package.weightGrams / 1000),
    },
  })
  if (!created.ok || !created.json?.shipment_id) {
    throw new ShiprocketError(
      `Shiprocket didn’t create the order: ${created.json?.message ?? `error ${created.status}`}`,
      created.status,
    )
  }
  const shipmentId = String(created.json.shipment_id)
  const awb = await call<AwbResponse>(ctx, '/courier/assign/awb', {
    method: 'POST',
    body: { shipment_id: shipmentId, ...(input.courierId ? { courier_id: input.courierId } : {}) },
  })
  const awbData = awb.json?.response?.data
  if (!awb.ok || !awbData?.awb_code) {
    throw new ShiprocketError(
      `Shiprocket made the order but couldn’t assign a courier: ${awb.json?.message ?? `error ${awb.status}`}. Check the wallet balance in Shiprocket.`,
      awb.status,
    )
  }
  const pickup = await call<PickupResponseBody>(ctx, '/courier/generate/pickup', {
    method: 'POST',
    body: { shipment_id: [shipmentId] },
  }).catch(() => null)
  const label = await call<LabelResponse>(ctx, '/courier/generate/label', {
    method: 'POST',
    body: { shipment_id: [shipmentId] },
  }).catch(() => null)
  return {
    providerOrderId: String(created.json.order_id ?? ''),
    providerShipmentId: shipmentId,
    awb: awbData.awb_code,
    courierName: awbData.courier_name ?? null,
    courierId: awbData.courier_company_id ? String(awbData.courier_company_id) : null,
    labelUrl: label?.json?.label_url ?? null,
    pickupScheduledFor: pickup?.json?.response?.pickup_scheduled_date ?? null,
    trackingUrl: trackingUrlFor(awbData.awb_code),
  }
}

export async function cancelShiprocketOrder(
  ctx: ConnectorContext,
  providerOrderId: string,
): Promise<void> {
  const response = await call<{ message?: string }>(ctx, '/orders/cancel', {
    method: 'POST',
    body: { ids: [Number(providerOrderId)] },
  })
  if (!response.ok) {
    throw new ShiprocketError(
      `Shiprocket couldn’t cancel it: ${response.json?.message ?? `error ${response.status}`}`,
      response.status,
    )
  }
}

// ---- Tracking ----------------------------------------------------------------------------

type TrackResponse = {
  tracking_data?: {
    shipment_status?: number
    shipment_track?: { current_status?: string; edd?: string; courier_name?: string }[]
    shipment_track_activities?: {
      date?: string
      status?: string
      activity?: string
      location?: string
      'sr-status-label'?: string
    }[]
  }
}

export type TrackingSnapshot = {
  status: string | null
  scans: { at: string; status: string; activity: string; location: string | null }[]
  expectedDeliveryDate: string | null
}

/** The AWB's tracking as Shiprocket knows it now (webhook check, missed-webhook job). */
export async function trackAwb(ctx: ConnectorContext, awb: string): Promise<TrackingSnapshot> {
  const response = await call<TrackResponse>(ctx, `/courier/track/awb/${encodeURIComponent(awb)}`)
  const data = response.json?.tracking_data
  return {
    status: data?.shipment_track?.[0]?.current_status ?? null,
    expectedDeliveryDate: data?.shipment_track?.[0]?.edd || null,
    scans: (data?.shipment_track_activities ?? []).map((scan) => ({
      at: scan.date ?? '',
      status: scan['sr-status-label'] ?? scan.status ?? '',
      activity: scan.activity ?? '',
      location: scan.location ?? null,
    })),
  }
}

export const shiprocket: ConnectorImplementation = { testCredentials }

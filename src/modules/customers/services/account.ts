import type { Payload, PayloadRequest } from 'payload'
import { z } from 'zod'

import { AppError } from '@/lib/errors'
import { isGstStateCode, parseGstin } from '@/lib/gst/gstin'
import { allow } from '@/lib/rate-limit'
import type { Address, Customer, Order } from '@/payload-types'

import { MAX_ADDRESSES, PASSWORD_MIN } from '../constants'
import { hashPassword, verifyPassword } from './password'

// A signed-in shopper's account (docs/screens storefront `st-account`, `st-order`): their
// orders, saved addresses, profile and password. Every query is scoped to the store and the
// account, so one shopper never reaches another's orders.

const PIN = /^[1-9][0-9]{5}$/

/** +91 and 10 digits from whatever the shopper typed, or null */
export function indianMobile(value: string | null | undefined): string | null {
  const digits = (value ?? '').replace(/[^0-9]/g, '')
  const ten =
    digits.length === 12 && digits.startsWith('91')
      ? digits.slice(2)
      : digits.length === 11 && digits.startsWith('0')
        ? digits.slice(1)
        : digits
  return /^[6-9][0-9]{9}$/.test(ten) ? `+91${ten}` : null
}

const mobile = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const normalized = indianMobile(value)
    if (!normalized)
      ctx.addIssue({ code: 'custom', message: 'Enter a 10-digit Indian mobile number' })
    return normalized ?? value
  })

/** Without the password hash: what pages and actions may hold */
export function withoutSecrets(customer: Customer): Customer {
  const rest: Customer = { ...customer }
  delete rest.passwordHash
  return rest
}

export async function findCustomerByEmail(
  req: PayloadRequest,
  tenantId: string,
  email: string,
): Promise<Customer | null> {
  const { docs } = await req.payload.find({
    collection: 'customers',
    where: { and: [{ tenant: { equals: tenantId } }, { email: { equals: email } }] },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  return docs[0] ?? null
}

/** Orders that count toward the account: placed and not abandoned before payment */
const COUNTED = ['confirmed', 'processing', 'completed']

/** Orders, spend and last order on the account, worked out again from its orders. */
export async function refreshCustomerStats(
  req: PayloadRequest,
  tenantId: string,
  customerId: string,
) {
  const { docs } = await req.payload.find({
    collection: 'orders',
    where: {
      and: [
        { tenant: { equals: tenantId } },
        { customer: { equals: customerId } },
        { status: { in: COUNTED } },
      ],
    },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { totals: true, placedAt: true, createdAt: true },
    req,
  })
  const spent = docs.reduce(
    (sum, order) => sum + (order.totals?.grandTotalMinor ?? 0) - (order.totals?.refundedMinor ?? 0),
    0,
  )
  const last = docs
    .map((order) => order.placedAt ?? order.createdAt)
    .sort()
    .at(-1)
  await req.payload.update({
    collection: 'customers',
    where: { and: [{ tenant: { equals: tenantId } }, { id: { equals: customerId } }] },
    data: {
      ordersCount: docs.length,
      totalSpentMinor: Math.max(0, spent),
      lastOrderAt: last ?? null,
    },
    overrideAccess: true,
    req,
  })
}

/**
 * Guest orders placed with the account's email join the account. Called after an email code,
 * which proves the email belongs to the shopper (docs/05 "Creating an account").
 */
export async function attachGuestOrders(req: PayloadRequest, tenantId: string, customer: Customer) {
  const { docs } = await req.payload.find({
    collection: 'orders',
    where: {
      and: [
        { tenant: { equals: tenantId } },
        { 'contact.email': { equals: customer.email } },
        { customer: { exists: false } },
      ],
    },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { id: true, contact: true },
    req,
  })
  if (!docs.length) return
  for (const order of docs) {
    await req.payload.update({
      collection: 'orders',
      id: order.id,
      data: { customer: String(customer.id) },
      overrideAccess: true,
      req,
    })
  }
  // The account takes the name and phone of the latest order when it has none
  const latest = docs.at(-1)?.contact
  if ((!customer.name && latest?.name) || (!customer.phone && latest?.phone)) {
    await req.payload.update({
      collection: 'customers',
      id: customer.id,
      data: {
        name: customer.name || latest?.name || undefined,
        phone: customer.phone || latest?.phone || undefined,
      },
      overrideAccess: true,
      req,
    })
  }
  await refreshCustomerStats(req, tenantId, String(customer.id))
}

// ---- Orders ---------------------------------------------------------------------------

/** The account's orders, newest first; unpaid online orders are not orders yet. */
export async function customerOrders(
  payload: Payload,
  tenantId: string,
  customerId: string,
  { limit = 50 }: { limit?: number } = {},
): Promise<Order[]> {
  const { docs } = await payload.find({
    collection: 'orders',
    where: {
      and: [
        { tenant: { equals: tenantId } },
        { customer: { equals: customerId } },
        { status: { not_equals: 'pending' } },
      ],
    },
    sort: '-placedAt',
    limit,
    depth: 0,
    overrideAccess: true,
  })
  return docs
}

export async function customerOrder(
  payload: Payload,
  tenantId: string,
  customerId: string,
  orderNumber: string,
): Promise<Order | null> {
  if (!/^[A-Za-z0-9-]{1,40}$/.test(orderNumber)) return null
  const { docs } = await payload.find({
    collection: 'orders',
    where: {
      and: [
        { tenant: { equals: tenantId } },
        { customer: { equals: customerId } },
        { orderNumber: { equals: orderNumber } },
        { status: { not_equals: 'pending' } },
      ],
    },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  return docs[0] ?? null
}

// ---- Profile and password ---------------------------------------------------------------

export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(80),
  phone: mobile.optional().or(z.literal('').transform(() => undefined)),
})

export async function updateProfile(
  req: PayloadRequest,
  tenantId: string,
  customerId: string,
  input: z.input<typeof profileSchema>,
): Promise<Customer> {
  const data = profileSchema.parse(input)
  const updated = await req.payload.update({
    collection: 'customers',
    where: { and: [{ tenant: { equals: tenantId } }, { id: { equals: customerId } }] },
    data: { name: data.name, phone: data.phone ?? null },
    overrideAccess: true,
    req,
  })
  if (!updated.docs[0]) throw new AppError('NOT_FOUND', 'Account not found', 404)
  return withoutSecrets(updated.docs[0])
}

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters`)
  .max(200)

/** Sets or changes the password; changing one needs the current password. */
export async function setPassword(
  req: PayloadRequest,
  tenantId: string,
  customerId: string,
  { password, current }: { password: string; current?: string },
) {
  const next = passwordSchema.parse(password)
  const { docs } = await req.payload.find({
    collection: 'customers',
    where: { and: [{ tenant: { equals: tenantId } }, { id: { equals: customerId } }] },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  const customer = docs[0]
  if (!customer) throw new AppError('NOT_FOUND', 'Account not found', 404)
  if (customer.passwordHash && !(await verifyPassword(current ?? '', customer.passwordHash))) {
    throw new AppError('BUSINESS_RULE', 'Your current password isn’t right', 400, {
      current: 'Your current password isn’t right',
    })
  }
  await req.payload.update({
    collection: 'customers',
    id: customer.id,
    data: { passwordHash: await hashPassword(next) },
    overrideAccess: true,
    req,
  })
}

const PASSWORD_LIMIT = { max: 5, windowMs: 15 * 60_000 }

/**
 * Password sign-in, for accounts that set one. The same message for an unknown email, a wrong
 * password or no password; five wrong tries lock the email for 15 minutes.
 */
export async function loginWithPassword(
  req: PayloadRequest,
  tenantId: string,
  email: string,
  password: string,
  { ip }: { ip?: string | null } = {},
): Promise<Customer> {
  const wrong = () =>
    new AppError('BUSINESS_RULE', 'That email or password isn’t right.', 400, {
      password: 'That email or password isn’t right',
    })
  if (
    !allow(`login-pw:${tenantId}:${email}`, PASSWORD_LIMIT) ||
    !allow(`login-pw-ip:${ip ?? 'unknown'}`, { max: 30, windowMs: 15 * 60_000 })
  ) {
    throw new AppError(
      'BUSINESS_RULE',
      'Too many tries. Wait 15 minutes, or log in with an email code.',
      429,
    )
  }
  const customer = await findCustomerByEmail(req, tenantId, email)
  const matches = await verifyPassword(password, customer?.passwordHash)
  if (!customer || !matches) throw wrong()
  if (customer.status === 'blocked') {
    throw new AppError('FORBIDDEN', 'This account can’t log in. Please contact the store.', 403)
  }
  const updated = await req.payload.update({
    collection: 'customers',
    id: customer.id,
    data: { lastLoginAt: new Date().toISOString() },
    overrideAccess: true,
    req,
  })
  return withoutSecrets(updated)
}

/** Does the account have a password (the profile offers "Set" or "Change") */
export async function hasPassword(payload: Payload, tenantId: string, customerId: string) {
  const { docs } = await payload.find({
    collection: 'customers',
    where: { and: [{ tenant: { equals: tenantId } }, { id: { equals: customerId } }] },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { passwordHash: true },
  })
  return Boolean(docs[0]?.passwordHash)
}

// ---- Addresses --------------------------------------------------------------------------

export const addressSchema = z
  .object({
    type: z.enum(['home', 'work', 'site']).default('home'),
    name: z.string().trim().min(2, 'Enter the name of the person receiving it').max(80),
    phone: mobile,
    line1: z.string().trim().min(3, 'Enter the house or building and street').max(120),
    line2: z.string().trim().max(120).optional().default(''),
    landmark: z.string().trim().max(80).optional().default(''),
    city: z.string().trim().min(2, 'Enter the city or town').max(60),
    stateCode: z.string().refine(isGstStateCode, 'Choose the state'),
    pincode: z.string().trim().regex(PIN, 'A pincode has 6 digits'),
    gstin: z
      .string()
      .trim()
      .toUpperCase()
      .optional()
      .refine((value) => !value || parseGstin(value).valid, 'This GSTIN isn’t valid'),
    legalName: z.string().trim().max(120).optional(),
    isDefault: z.boolean().default(false),
  })
  .refine((input) => !input.gstin || input.legalName, {
    path: ['legalName'],
    message: 'Enter the business name registered with this GSTIN',
  })
export type AddressInput = z.input<typeof addressSchema>

export async function customerAddresses(
  payload: Payload,
  tenantId: string,
  customerId: string,
  req?: PayloadRequest,
): Promise<Address[]> {
  const { docs } = await payload.find({
    collection: 'addresses',
    where: { and: [{ tenant: { equals: tenantId } }, { customer: { equals: customerId } }] },
    sort: '-isDefault',
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  return docs
}

/** Adds an address, or changes one of the account's own (`id`). The first is the default. */
export async function saveAddress(
  req: PayloadRequest,
  tenantId: string,
  customerId: string,
  input: AddressInput,
  id?: string | null,
): Promise<Address> {
  const parsed = addressSchema.parse(input)
  const existing = await customerAddresses(req.payload, tenantId, customerId, req)
  const own = id ? existing.find((a) => String(a.id) === id) : null
  if (id && !own) throw new AppError('NOT_FOUND', 'Address not found', 404)
  if (!own && existing.length >= MAX_ADDRESSES) {
    throw new AppError('BUSINESS_RULE', `You can save up to ${MAX_ADDRESSES} addresses.`, 422)
  }
  const isDefault = parsed.isDefault || existing.length === 0 || Boolean(own?.isDefault)
  if (isDefault) {
    for (const other of existing.filter((a) => a.isDefault && String(a.id) !== id)) {
      await req.payload.update({
        collection: 'addresses',
        id: other.id,
        data: { isDefault: false },
        overrideAccess: true,
        req,
      })
    }
  }
  const data = {
    type: parsed.type,
    isDefault,
    gstin: parsed.gstin || null,
    legalName: parsed.gstin ? parsed.legalName || null : null,
    address: {
      name: parsed.name,
      phone: parsed.phone,
      line1: parsed.line1,
      line2: parsed.line2,
      landmark: parsed.landmark,
      city: parsed.city,
      stateCode: parsed.stateCode as NonNullable<Address['address']>['stateCode'],
      pincode: parsed.pincode,
      country: 'IN',
    },
  }
  if (own) {
    return req.payload.update({
      collection: 'addresses',
      id: own.id,
      data,
      overrideAccess: true,
      req,
    })
  }
  return req.payload.create({
    collection: 'addresses',
    data: { tenant: tenantId, customer: customerId, ...data },
    overrideAccess: true,
    req,
  })
}

export async function deleteAddress(
  req: PayloadRequest,
  tenantId: string,
  customerId: string,
  id: string,
) {
  const existing = await customerAddresses(req.payload, tenantId, customerId, req)
  const own = existing.find((a) => String(a.id) === id)
  if (!own) throw new AppError('NOT_FOUND', 'Address not found', 404)
  await req.payload.delete({ collection: 'addresses', id: own.id, overrideAccess: true, req })
  // Another address takes over as the default
  const next = existing.find((a) => String(a.id) !== id)
  if (own.isDefault && next) {
    await req.payload.update({
      collection: 'addresses',
      id: next.id,
      data: { isDefault: true },
      overrideAccess: true,
      req,
    })
  }
}

/**
 * Checkout's "Save this address to my account": adds the delivery address unless the account
 * already has the same one.
 */
export async function rememberCheckoutAddress(
  req: PayloadRequest,
  tenantId: string,
  customerId: string,
  address: Omit<AddressInput, 'type' | 'isDefault'>,
) {
  const existing = await customerAddresses(req.payload, tenantId, customerId, req)
  const same = existing.some(
    (a) =>
      a.address?.pincode === address.pincode &&
      (a.address?.line1 ?? '').toLowerCase() === address.line1.trim().toLowerCase(),
  )
  if (same || existing.length >= MAX_ADDRESSES) return
  await saveAddress(req, tenantId, customerId, { ...address, type: 'home' })
}

/**
 * The Customers screen's "Offers" column mirrors what the shopper agreed to on their email and
 * phone (docs/06: the contact-preferences rows are the source of truth).
 */
export async function syncMarketingMirror(
  req: PayloadRequest,
  tenantId: string,
  customer: Pick<Customer, 'id' | 'email' | 'phone'>,
  consent: { email: boolean; whatsapp: boolean },
) {
  await req.payload.update({
    collection: 'customers',
    where: { and: [{ tenant: { equals: tenantId } }, { id: { equals: customer.id } }] },
    data: { marketingConsent: consent },
    overrideAccess: true,
    req,
  })
}

/** The first order fills in the account's name and mobile when it has none yet. */
export async function completeProfileFromOrder(
  req: PayloadRequest,
  tenantId: string,
  customer: Pick<Customer, 'id' | 'name' | 'phone'>,
  contact: { name?: string | null; phone?: string | null },
) {
  if ((customer.name || !contact.name) && (customer.phone || !contact.phone)) return
  await req.payload.update({
    collection: 'customers',
    where: { and: [{ tenant: { equals: tenantId } }, { id: { equals: customer.id } }] },
    data: {
      name: customer.name || contact.name || undefined,
      phone: customer.phone || indianMobile(contact.phone) || undefined,
    },
    overrideAccess: true,
    req,
  })
}

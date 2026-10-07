import { createHash } from 'node:crypto'

import type { PayloadRequest, Where } from 'payload'
import { z } from 'zod'

import { AppError } from '@/lib/errors'
import type { Customer, PrivacyRequest } from '@/payload-types'

import { PRIVACY_DUE_DAYS, PRIVACY_STATUSES, PRIVACY_TYPES } from '../constants'
import { indianMobile, withoutSecrets } from './account'
import { revokeAllSessions } from './sessions'

// Privacy requests under India's DPDP Act (docs/14, docs/screens Customers rule 2): staff record
// what the shopper asked, export their data, or delete the account. Orders and invoices keep
// what tax law requires; everything else about the person goes.

const values = <T extends readonly { value: string }[]>(list: T) =>
  list.map((item) => item.value) as [T[number]['value'], ...T[number]['value'][]]

export const recordRequestSchema = z
  .object({
    type: z.enum(values(PRIVACY_TYPES)),
    email: z.email('Enter a valid email').trim().toLowerCase().optional().or(z.literal('')),
    phone: z.string().trim().max(20).optional().or(z.literal('')),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((input) => input.email || input.phone, {
    path: ['email'],
    message: 'Enter the shopper’s email or phone',
  })

export const updateRequestSchema = z.object({
  status: z.enum(values(PRIVACY_STATUSES)),
  notes: z.string().trim().max(2000).optional(),
})

const who = (req: PayloadRequest) => {
  const user = req.user as { id?: string | number; name?: string | null; email?: string } | null
  return {
    id: user?.id ? String(user.id) : undefined,
    name: user?.name || user?.email || undefined,
  }
}

async function accountFor(
  req: PayloadRequest,
  tenantId: string,
  { email, phone }: { email?: string | null; phone?: string | null },
): Promise<Customer | null> {
  const or: Where[] = [
    ...(email ? [{ email: { equals: email } }] : []),
    ...(phone && indianMobile(phone) ? [{ phone: { equals: indianMobile(phone) } }] : []),
  ]
  if (!or.length) return null
  const { docs } = await req.payload.find({
    collection: 'customers',
    where: { and: [{ tenant: { equals: tenantId } }, { or }] },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  return docs[0] ?? null
}

export async function recordPrivacyRequest(
  req: PayloadRequest,
  tenantId: string,
  input: z.input<typeof recordRequestSchema>,
): Promise<PrivacyRequest> {
  const data = recordRequestSchema.parse(input)
  const phone = data.phone ? (indianMobile(data.phone) ?? data.phone) : undefined
  const account = await accountFor(req, tenantId, { email: data.email, phone })
  const now = new Date()
  const handler = who(req)
  return req.payload.create({
    collection: 'privacy-requests',
    data: {
      tenant: tenantId,
      type: data.type,
      status: 'received',
      customer: account ? String(account.id) : undefined,
      contact: { email: data.email || account?.email || undefined, phone: phone || undefined },
      receivedAt: now.toISOString(),
      dueAt: new Date(now.getTime() + PRIVACY_DUE_DAYS * 86_400_000).toISOString(),
      notes: data.notes,
      handledBy: handler.id,
      handledByName: handler.name,
    },
    overrideAccess: true,
    req,
  })
}

async function requestOf(req: PayloadRequest, tenantId: string, id: string) {
  const { docs } = await req.payload.find({
    collection: 'privacy-requests',
    where: { and: [{ tenant: { equals: tenantId } }, { id: { equals: id } }] },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  if (!docs[0]) throw new AppError('NOT_FOUND', 'Request not found', 404)
  return docs[0]
}

/**
 * Moves a request on. Marking a deletion done deletes the account (`deleteCustomerData`), so it
 * can't be undone; a request that is done or rejected stays closed.
 */
export async function updatePrivacyRequest(
  req: PayloadRequest,
  tenantId: string,
  id: string,
  input: z.input<typeof updateRequestSchema>,
): Promise<PrivacyRequest> {
  const data = updateRequestSchema.parse(input)
  const request = await requestOf(req, tenantId, id)
  if (request.status === 'done' || request.status === 'rejected') {
    throw new AppError('INVALID_TRANSITION', 'This request is closed', 409)
  }
  if (data.status === 'done' && request.type === 'deletion') {
    await deleteCustomerData(req, tenantId, {
      customerId: request.customer,
      email: request.contact?.email,
      phone: request.contact?.phone,
    })
  }
  const handler = who(req)
  const closed = data.status === 'done' || data.status === 'rejected'
  return req.payload.update({
    collection: 'privacy-requests',
    id: request.id,
    data: {
      status: data.status,
      notes: data.notes ?? request.notes,
      handledBy: handler.id,
      handledByName: handler.name,
      completedAt: closed ? new Date().toISOString() : null,
    },
    overrideAccess: true,
    req,
  })
}

/** Everything the store holds about the person, as JSON for the shopper (data export). */
export async function exportCustomerData(req: PayloadRequest, tenantId: string, id: string) {
  const request = await requestOf(req, tenantId, id)
  const email = request.contact?.email ?? null
  const phone = request.contact?.phone ?? null
  const account = request.customer
    ? (
        await req.payload.find({
          collection: 'customers',
          where: { and: [{ tenant: { equals: tenantId } }, { id: { equals: request.customer } }] },
          limit: 1,
          depth: 0,
          pagination: false,
          overrideAccess: true,
          req,
        })
      ).docs[0]
    : null
  const contactOr: Where[] = [
    ...(email ? [{ 'contact.email': { equals: email } }] : []),
    ...(phone ? [{ 'contact.phone': { equals: phone } }] : []),
    ...(account ? [{ customer: { equals: String(account.id) } }] : []),
  ]
  const [orders, addresses, preferences] = [
    contactOr.length
      ? (
          await req.payload.find({
            collection: 'orders',
            where: { and: [{ tenant: { equals: tenantId } }, { or: contactOr }] },
            depth: 0,
            pagination: false,
            overrideAccess: true,
            req,
          })
        ).docs
      : [],
    account
      ? (
          await req.payload.find({
            collection: 'addresses',
            where: {
              and: [{ tenant: { equals: tenantId } }, { customer: { equals: String(account.id) } }],
            },
            depth: 0,
            pagination: false,
            overrideAccess: true,
            req,
          })
        ).docs
      : [],
    (
      await req.payload.find({
        collection: 'contact-preferences',
        where: {
          and: [
            { tenant: { equals: tenantId } },
            {
              value: {
                in: [email, phone, account?.email, account?.phone].filter(Boolean) as string[],
              },
            },
          ],
        },
        depth: 0,
        pagination: false,
        overrideAccess: true,
        req,
      })
    ).docs,
  ]
  const strip = <T extends Record<string, unknown>>(doc: T, keys: string[]) =>
    Object.fromEntries(Object.entries(doc).filter(([key]) => !keys.includes(key)))
  return {
    exportedAt: new Date().toISOString(),
    account: account
      ? strip(withoutSecrets(account) as unknown as Record<string, unknown>, ['notes', 'tenant'])
      : null,
    addresses: addresses.map((a) => strip(a as unknown as Record<string, unknown>, ['tenant'])),
    orders: orders.map((order) => ({
      orderNumber: order.orderNumber,
      placedAt: order.placedAt,
      status: order.status,
      contact: order.contact,
      items: (order.items ?? []).map((item) => ({
        title: item.title,
        options: item.options,
        qty: item.qty,
        lineTotalMinor: item.lineTotalMinor,
      })),
      totalMinor: order.totals?.grandTotalMinor,
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
      buyerGstin: order.buyerGstin,
    })),
    preferences: preferences.map((p) => ({
      type: p.type,
      value: p.value,
      whatsapp: p.whatsapp,
      offers: p.offers,
    })),
  }
}

const hashed = (value: string) =>
  `deleted:${createHash('sha256').update(value).digest('hex').slice(0, 24)}`

/**
 * Deletes the account and what hangs off it: sessions, codes, saved addresses, and the contact
 * point in preferences (replaced by a hash, docs/06). Orders stay for tax law but no longer
 * belong to an account.
 */
export async function deleteCustomerData(
  req: PayloadRequest,
  tenantId: string,
  {
    customerId,
    email,
    phone,
  }: { customerId?: string | null; email?: string | null; phone?: string | null },
) {
  const scoped = (extra: Where): Where => ({ and: [{ tenant: { equals: tenantId } }, extra] })
  let account: Customer | undefined
  if (customerId) {
    account = (
      await req.payload.find({
        collection: 'customers',
        where: scoped({ id: { equals: customerId } }),
        limit: 1,
        depth: 0,
        pagination: false,
        overrideAccess: true,
        req,
      })
    ).docs[0]
  }
  const contactValues = [email, phone, account?.email, account?.phone].filter(
    (value): value is string => Boolean(value),
  )
  if (account) {
    const id = String(account.id)
    await revokeAllSessions(req, tenantId, id)
    await req.payload.delete({
      collection: 'customer-sessions',
      where: scoped({ customer: { equals: id } }),
      overrideAccess: true,
      req,
    })
    await req.payload.delete({
      collection: 'addresses',
      where: scoped({ customer: { equals: id } }),
      overrideAccess: true,
      req,
    })
    await req.payload.delete({
      collection: 'login-codes',
      where: scoped({ email: { equals: account.email } }),
      overrideAccess: true,
      req,
    })
    await req.payload.update({
      collection: 'orders',
      where: scoped({ customer: { equals: id } }),
      data: { customer: null },
      overrideAccess: true,
      req,
    })
    await req.payload.delete({
      collection: 'customers',
      id: account.id,
      overrideAccess: true,
      req,
    })
  }
  if (contactValues.length) {
    const { docs } = await req.payload.find({
      collection: 'contact-preferences',
      where: scoped({ value: { in: contactValues } }),
      depth: 0,
      pagination: false,
      overrideAccess: true,
      req,
    })
    for (const pref of docs) {
      await req.payload.update({
        collection: 'contact-preferences',
        id: pref.id,
        data: { value: hashed(pref.value) },
        overrideAccess: true,
        req,
      })
    }
  }
}

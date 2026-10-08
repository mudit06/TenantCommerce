'use server'

import { cookies } from 'next/headers'
import { createLocalReq } from 'payload'
import { ZodError } from 'zod'

import { getPayloadClient } from '@/lib/data/payload'
import { withTransaction } from '@/lib/db/transaction'
import { isAppError } from '@/lib/errors'
import {
  createSession,
  customerOrder,
  deleteAddress,
  loginWithPassword,
  revokeAllSessions,
  revokeSession,
  saveAddress,
  sendLoginCode,
  SESSION_COOKIE,
  setPassword,
  syncMarketingMirror,
  updateProfile,
  verifyLoginCode,
  type AddressInput,
} from '@/modules/customers'
import {
  offersAgreed,
  preferenceFor,
  setOfferConsent,
  setWhatsAppUpdates,
} from '@/modules/notifications'
import { cancelOrder, requestReturn, type ReturnPhoto } from '@/modules/orders'
import { isFeatureEnabled } from '@/modules/tenancy'

import { addToCart } from './actions'
import { clearSessionCookie, safeNext, setSessionCookie, signedInShopper } from './account'
import { currentStore, visitorMeta } from './server'

// Shopper accounts on the storefront (docs/screens storefront `st-login`, `st-account`,
// `st-order`). The store is always the request's host, and every account action works on the
// signed-in shopper's own account only.

export type AccountResult<T = null> =
  { ok: true; data: T } | { ok: false; message: string; fields?: Record<string, string> }

const GENERIC = 'Something went wrong. Please try again.'
const CLOSED = 'This store isn’t open at the moment.'
const SIGNED_OUT = 'Your session has ended. Please log in again.'

function failure(error: unknown): { ok: false; message: string; fields?: Record<string, string> } {
  if (error instanceof ZodError) {
    const fields: Record<string, string> = {}
    for (const issue of error.issues) fields[issue.path.join('.')] ??= issue.message
    return { ok: false, message: Object.values(fields)[0] ?? 'Please check the form.', fields }
  }
  if (isAppError(error)) return { ok: false, message: error.message, fields: error.fields }
  console.error('[account] action failed', error)
  return { ok: false, message: GENERIC }
}

async function context() {
  const store = await currentStore()
  if (!store) return null
  const payload = await getPayloadClient()
  const req = await createLocalReq({}, payload)
  return { store, payload, req }
}

async function signIn(tenantId: string, customerId: string, next: string | null | undefined) {
  const payload = await getPayloadClient()
  const req = await createLocalReq({}, payload)
  const meta = await visitorMeta()
  const { token, expiresAt } = await createSession(req, tenantId, customerId, meta)
  await setSessionCookie(token, expiresAt)
  return safeNext(next)
}

/** "Send code": the same answer whether or not the email has an account (docs/05). */
export async function sendCode(
  email: string,
): Promise<AccountResult<{ maskedEmail: string; waitSeconds: number }>> {
  try {
    const ctx = await context()
    if (!ctx) return { ok: false, message: CLOSED }
    const { ip } = await visitorMeta()
    const settings = await ctx.payload.find({
      collection: 'site-settings',
      where: { tenant: { equals: ctx.store.tenantId } },
      limit: 1,
      depth: 0,
      pagination: false,
      overrideAccess: true,
    })
    const result = await withTransaction(ctx.req, () =>
      sendLoginCode(ctx.req, ctx.store.tenantId, email, {
        ip,
        storeName: settings.docs[0]?.storeName || ctx.store.name,
        themeColor: settings.docs[0]?.themeColor,
      }),
    )
    return { ok: true, data: result }
  } catch (error) {
    return failure(error)
  }
}

export async function verifyCode(
  email: string,
  code: string,
  next?: string | null,
): Promise<AccountResult<{ next: string }>> {
  try {
    const ctx = await context()
    if (!ctx) return { ok: false, message: CLOSED }
    const { ip } = await visitorMeta()
    const customer = await withTransaction(ctx.req, () =>
      verifyLoginCode(ctx.req, ctx.store.tenantId, email, code, { ip }),
    )
    return { ok: true, data: { next: await signIn(ctx.store.tenantId, String(customer.id), next) } }
  } catch (error) {
    return failure(error)
  }
}

export async function passwordLogin(
  email: string,
  password: string,
  next?: string | null,
): Promise<AccountResult<{ next: string }>> {
  try {
    const ctx = await context()
    if (!ctx) return { ok: false, message: CLOSED }
    const { ip } = await visitorMeta()
    const customer = await loginWithPassword(
      ctx.req,
      ctx.store.tenantId,
      email.trim().toLowerCase(),
      password,
      { ip },
    )
    return { ok: true, data: { next: await signIn(ctx.store.tenantId, String(customer.id), next) } }
  } catch (error) {
    return failure(error)
  }
}

export async function logOut(everywhere = false): Promise<AccountResult> {
  try {
    const ctx = await context()
    const token = (await cookies()).get(SESSION_COOKIE)?.value
    if (ctx && token) {
      const session = await signedInShopper(ctx.store.tenantId)
      if (everywhere && session) {
        await revokeAllSessions(ctx.req, ctx.store.tenantId, String(session.customer.id))
      } else {
        await revokeSession(ctx.payload, ctx.store.tenantId, token)
      }
    }
    await clearSessionCookie()
    return { ok: true, data: null }
  } catch (error) {
    return failure(error)
  }
}

/** The signed-in shopper, or a "log in again" answer */
async function shopper() {
  const ctx = await context()
  if (!ctx) return { error: { ok: false as const, message: CLOSED } }
  const session = await signedInShopper(ctx.store.tenantId)
  if (!session) return { error: { ok: false as const, message: SIGNED_OUT } }
  return { ...ctx, customer: session.customer }
}

export async function saveProfile(input: { name: string; phone: string }): Promise<AccountResult> {
  try {
    const me = await shopper()
    if ('error' in me) return me.error!
    await updateProfile(me.req, me.store.tenantId, String(me.customer.id), input)
    return { ok: true, data: null }
  } catch (error) {
    return failure(error)
  }
}

export async function changePassword(input: {
  password: string
  current?: string
}): Promise<AccountResult> {
  try {
    const me = await shopper()
    if ('error' in me) return me.error!
    await setPassword(me.req, me.store.tenantId, String(me.customer.id), input)
    return { ok: true, data: null }
  } catch (error) {
    return failure(error)
  }
}

export async function saveMyAddress(
  input: AddressInput,
  id?: string | null,
): Promise<AccountResult> {
  try {
    const me = await shopper()
    if ('error' in me) return me.error!
    await withTransaction(me.req, () =>
      saveAddress(me.req, me.store.tenantId, String(me.customer.id), input, id),
    )
    return { ok: true, data: null }
  } catch (error) {
    return failure(error)
  }
}

export async function deleteMyAddress(id: string): Promise<AccountResult> {
  try {
    const me = await shopper()
    if ('error' in me) return me.error!
    await withTransaction(me.req, () =>
      deleteAddress(me.req, me.store.tenantId, String(me.customer.id), id),
    )
    return { ok: true, data: null }
  } catch (error) {
    return failure(error)
  }
}

/**
 * Order updates on WhatsApp for the account's phone (docs/screens My account rule 5): kept by
 * number, so guest orders with the same number follow.
 */
export async function setMyWhatsAppUpdates(on: boolean): Promise<AccountResult<{ on: boolean }>> {
  try {
    const me = await shopper()
    if ('error' in me) return me.error!
    if (!me.customer.phone)
      return { ok: false, message: 'Add your mobile number in Profile first.' }
    await withTransaction(me.req, () =>
      setWhatsAppUpdates(me.req, me.store.tenantId, me.customer.phone!, on, 'account'),
    )
    return { ok: true, data: { on } }
  } catch (error) {
    return failure(error)
  }
}

/** Offers by email or WhatsApp (rule 6): separate from order updates, only the shopper agrees. */
export async function setMyOffers(
  channel: 'email' | 'whatsapp',
  on: boolean,
): Promise<AccountResult<{ on: boolean }>> {
  try {
    const me = await shopper()
    if ('error' in me) return me.error!
    const feature = channel === 'whatsapp' ? 'whatsapp-offers' : 'offer-messages'
    if (!(await isFeatureEnabled(me.payload, me.store.tenantId, feature))) {
      return { ok: false, message: 'This store doesn’t send offers.' }
    }
    const value = channel === 'email' ? me.customer.email : me.customer.phone
    if (!value) return { ok: false, message: 'Add your mobile number in Profile first.' }
    await withTransaction(me.req, async () => {
      await setOfferConsent(me.req, me.store.tenantId, channel, value, on, 'account')
      const [emailPref, phonePref] = [
        await preferenceFor(me.payload, me.store.tenantId, 'email', me.customer.email, me.req),
        me.customer.phone
          ? await preferenceFor(me.payload, me.store.tenantId, 'phone', me.customer.phone, me.req)
          : null,
      ]
      await syncMarketingMirror(me.req, me.store.tenantId, me.customer, {
        email: offersAgreed(emailPref, 'email'),
        whatsapp: offersAgreed(phonePref, 'whatsapp'),
      })
    })
    return { ok: true, data: { on } }
  } catch (error) {
    return failure(error)
  }
}

/** "Cancel order" on the order page: until it ships (docs/screens Order tracking rule 4). */
export async function cancelMyOrder(orderNumber: string): Promise<AccountResult> {
  try {
    const me = await shopper()
    if ('error' in me) return me.error!
    const order = await customerOrder(
      me.payload,
      me.store.tenantId,
      String(me.customer.id),
      orderNumber,
    )
    if (!order) return { ok: false, message: 'We can’t find this order in your account.' }
    await withTransaction(me.req, () =>
      cancelOrder(me.req, String(order.id), {
        reason: 'Cancelled by the shopper',
        byLabel: me.customer.name || me.customer.email,
      }),
    )
    return { ok: true, data: null }
  } catch (error) {
    return failure(error)
  }
}

/** "Request return" on a delivered order inside the return window (docs/11 "Returns"). */
export async function requestMyReturn(form: FormData): Promise<AccountResult> {
  try {
    const me = await shopper()
    if ('error' in me) return me.error!
    const order = await customerOrder(
      me.payload,
      me.store.tenantId,
      String(me.customer.id),
      String(form.get('orderNumber') ?? ''),
    )
    if (!order) return { ok: false, message: 'We can’t find this order in your account.' }
    let items: { orderItemId: string; qty: number }[] = []
    try {
      items = JSON.parse(String(form.get('items') ?? '[]'))
    } catch {
      items = []
    }
    const photos: ReturnPhoto[] = []
    for (const file of form.getAll('photos')) {
      if (file instanceof File && file.size > 0) {
        photos.push({
          data: Buffer.from(await file.arrayBuffer()),
          name: file.name,
          mimetype: file.type,
        })
      }
    }
    await withTransaction(me.req, () =>
      requestReturn(
        me.req,
        me.store.tenantId,
        order,
        {
          items,
          reason: String(form.get('reason') ?? ''),
          note: String(form.get('note') ?? '') || undefined,
        },
        { photos, customerId: String(me.customer.id) },
      ),
    )
    return { ok: true, data: null }
  } catch (error) {
    return failure(error)
  }
}

/** "Buy again" on a delivered order: its items go back in the cart at today's prices. */
export async function buyAgain(
  orderNumber: string,
): Promise<AccountResult<{ added: number; skipped: number }>> {
  try {
    const me = await shopper()
    if ('error' in me) return me.error!
    const order = await customerOrder(
      me.payload,
      me.store.tenantId,
      String(me.customer.id),
      orderNumber,
    )
    if (!order) return { ok: false, message: 'We can’t find this order in your account.' }
    let added = 0
    let skipped = 0
    for (const item of order.items ?? []) {
      if (!item.productId) {
        skipped += 1
        continue
      }
      const result = await addToCart({
        productId: item.productId,
        variantId: item.variantId ?? null,
        qty: item.qty,
      })
      if (result.ok) added += 1
      else skipped += 1
    }
    return { ok: true, data: { added, skipped } }
  } catch (error) {
    return failure(error)
  }
}

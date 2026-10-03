'use server'

import { headers } from 'next/headers'

import { getPayloadClient } from '@/lib/data/payload'
import { getStoreByHost } from '@/lib/data/store'
import { allow, LIMITS } from '@/lib/rate-limit'
import { createStoreEnquiry, storeEnquirySchema } from '@/modules/enquiries'

import { STORE_HOST_HEADER } from './constants'

export type EnquiryState =
  | { status: 'idle' }
  | { status: 'sent'; reference: string }
  | { status: 'error'; message: string; fields?: Record<string, string> }

const GENERIC = 'Something went wrong. Please call or WhatsApp us instead.'

/**
 * Quote and contact forms (docs/screens storefront forms, docs/14 spam rules: honeypot and
 * 5 per 10 minutes per visitor). The store is the request's host, never a form field.
 */
export async function sendEnquiry(_previous: EnquiryState, form: FormData): Promise<EnquiryState> {
  const requestHeaders = await headers()
  const host = requestHeaders.get(STORE_HOST_HEADER)
  const store = host ? await getStoreByHost(host) : null
  const open =
    store &&
    (store.status === 'active' ||
      (store.status === 'draft' && process.env.NODE_ENV !== 'production'))
  if (!store || !open) return { status: 'error', message: GENERIC }
  // Bots fill the hidden field; they get a quiet "sent" and nothing is stored
  if (form.get('website')) return { status: 'sent', reference: '' }
  const visitor =
    requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    requestHeaders.get('x-real-ip') ||
    'local'
  if (!allow(`enquiry:${store.tenantId}:${visitor}`, LIMITS.enquiry)) {
    return {
      status: 'error',
      message: 'You have sent several requests already. Please wait a few minutes, or call us.',
    }
  }
  const parsed = storeEnquirySchema.safeParse({
    type: form.get('type') || undefined,
    name: form.get('name'),
    phone: form.get('phone') ?? '',
    email: form.get('email') ?? '',
    city: form.get('city') ?? '',
    pincode: form.get('pincode') ?? '',
    company: form.get('company') ?? '',
    qty: form.get('qty') ?? '',
    message: [form.get('options'), form.get('message')].filter(Boolean).join('\n\n'),
    productTitle: form.get('productTitle') ?? '',
    modelNumber: form.get('modelNumber') ?? '',
    page: form.get('page') ?? '',
    consent: form.get('consent') === 'on',
  })
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? '_')] ??= issue.message
    return { status: 'error', message: 'Please check the highlighted fields.', fields }
  }
  try {
    const result = await createStoreEnquiry(await getPayloadClient(), store.tenantId, parsed.data)
    if ('disabled' in result) {
      return {
        status: 'error',
        message: 'This store takes enquiries by phone or WhatsApp. Please contact us there.',
      }
    }
    return { status: 'sent', reference: result.referenceNumber }
  } catch {
    return { status: 'error', message: GENERIC }
  }
}

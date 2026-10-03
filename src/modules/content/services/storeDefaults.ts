import type { PayloadRequest, RequiredDataFromCollectionSlug } from 'payload'

import { plainTextToLexical } from '@/lib/richtext'
import type { Page, Tenant } from '@/payload-types'

/** Policy pages every store needs before launch (docs/14 Consumer Protection rules). */
const POLICY_PAGES = [
  { key: 'shipping', slug: 'shipping', title: 'Shipping policy' },
  { key: 'returns', slug: 'returns', title: 'Returns and refunds' },
  { key: 'privacy', slug: 'privacy', title: 'Privacy policy' },
  { key: 'terms', slug: 'terms', title: 'Terms of use' },
  { key: 'warranty', slug: 'warranty', title: 'Warranty policy' },
] as const

/** AQV for "aquaverde": three letters of the slug, as the order number prefix. */
export function orderPrefixFor(slug: string): string {
  const letters = slug.replace(/[^a-z]/gi, '').toUpperCase()
  return (letters + 'XXX').slice(0, 3)
}

function addressText(tenant: Tenant): string | undefined {
  const a = tenant.registeredAddress
  if (!a) return undefined
  const lines = [a.line1, a.line2, [a.city, a.pincode].filter(Boolean).join(' ')].filter(Boolean)
  return lines.length ? lines.join(', ') : undefined
}

async function findOne(
  req: PayloadRequest,
  collection: 'site-settings' | 'navigation',
  tenantId: string,
) {
  const { docs } = await req.payload.find({
    collection,
    where: { tenant: { equals: tenantId } },
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
  })
  return docs[0]
}

async function ensurePage(
  req: PayloadRequest,
  tenantId: string,
  page: { slug: string; title: string; template: Page['template']; text?: string },
): Promise<string> {
  const { docs } = await req.payload.find({
    collection: 'pages',
    where: { and: [{ tenant: { equals: tenantId } }, { slug: { equals: page.slug } }] },
    depth: 0,
    limit: 1,
    draft: true,
    overrideAccess: true,
    req,
  })
  if (docs[0]) return String(docs[0].id)
  const created = await req.payload.create({
    collection: 'pages',
    data: {
      tenant: tenantId,
      title: page.title,
      slug: page.slug,
      template: page.template,
      _status: 'draft',
      layout: page.text ? [{ blockType: 'richText', content: plainTextToLexical(page.text) }] : [],
    },
    draft: true,
    overrideAccess: true,
    req,
  })
  return String(created.id)
}

/**
 * A new store's content defaults (docs/04 "Create"): store settings prefilled from the vendor
 * record, empty menus, a draft home page and draft policy pages linked from settings. Safe to
 * run again: it only adds what is missing, so it also backfills older stores.
 */
export async function ensureStoreDefaults(req: PayloadRequest, tenantId: string): Promise<void> {
  const tenant = await req.payload.findByID({
    collection: 'tenants',
    id: tenantId,
    depth: 0,
    overrideAccess: true,
    req,
  })

  const policyIds: Partial<Record<(typeof POLICY_PAGES)[number]['key'], string>> = {}
  for (const policy of POLICY_PAGES) {
    policyIds[policy.key] = await ensurePage(req, tenantId, {
      slug: policy.slug,
      title: policy.title,
      template: 'policy',
      text: `Write the ${policy.title.toLowerCase()} for ${tenant.name} here, then publish the page. A store should not go live with this page in draft.`,
    })
  }
  await ensurePage(req, tenantId, { slug: 'home', title: 'Home', template: 'landing' })

  if (!(await findOne(req, 'site-settings', tenantId))) {
    const care = [tenant.supportPhone, tenant.supportEmail].filter(Boolean).join(' · ')
    const settings: RequiredDataFromCollectionSlug<'site-settings'> = {
      tenant: tenantId,
      storeName: tenant.name,
      orderPrefix: orderPrefixFor(tenant.slug),
      contact: {
        email: tenant.supportEmail ?? undefined,
        phone: tenant.supportPhone ?? undefined,
        whatsapp: tenant.whatsappNumber ?? undefined,
        address: addressText(tenant),
      },
      legalDefaults: {
        manufacturerName: tenant.legalName,
        manufacturerAddress: addressText(tenant),
        consumerCare: care || undefined,
      },
      invoice: { prefix: 'INV' },
      checkout: { minOrderValue: { amountMinor: 0, currency: 'INR' } },
      returns: { windowDays: 7, exchangeOnly: false },
      seoDefaults: { titleTemplate: `%s · ${tenant.name}` },
      policies: policyIds,
    }
    await req.payload.create({
      collection: 'site-settings',
      data: settings,
      overrideAccess: true,
      req,
    })
  }

  if (!(await findOne(req, 'navigation', tenantId))) {
    await req.payload.create({
      collection: 'navigation',
      data: { tenant: tenantId, header: [], footer: [], mobileSameAsHeader: true },
      overrideAccess: true,
      req,
    })
  }
}

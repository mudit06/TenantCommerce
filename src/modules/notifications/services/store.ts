import type { Payload, PayloadRequest } from 'payload'

import { env } from '@/lib/env'
import { storeOriginForHost } from '@/lib/storeOrigin'
import { subdomainFor } from '@/modules/tenancy'

// What every message says about the store: its name, its own domain for the tracking link and
// how to reach it (site-settings contact). Shoppers never see the platform's name (ADR 0005).

export type StoreFacts = {
  storeName: string
  storeOrigin: string
  supportPhone: string | null
  supportEmail: string | null
  themeColor: string | null
  orderPrefix: string | null
  timeZone: string
}

export async function storeFacts(
  payload: Payload,
  tenantId: string,
  req?: PayloadRequest,
): Promise<StoreFacts> {
  // One at a time: this can run inside a transaction
  const tenant = await payload.findByID({
    collection: 'tenants',
    id: tenantId,
    depth: 0,
    overrideAccess: true,
    req,
  })
  const { docs: settings } = await payload.find({
    collection: 'site-settings',
    where: { tenant: { equals: tenantId } },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  const { docs: domains } = await payload.find({
    collection: 'tenant-domains',
    where: { and: [{ tenant: { equals: tenantId } }, { isPrimary: { equals: true } }] },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  const site = settings[0]
  const host = domains[0]?.host ?? subdomainFor(tenant.slug)
  return {
    storeName: site?.storeName || tenant.name,
    storeOrigin: storeOriginForHost(host, env.ADMIN_URL) ?? `https://${host}`,
    supportPhone: site?.contact?.phone || null,
    supportEmail: site?.contact?.email || null,
    themeColor: site?.themeColor || null,
    orderPrefix: site?.orderPrefix || null,
    timeZone: tenant.timezone || 'Asia/Kolkata',
  }
}

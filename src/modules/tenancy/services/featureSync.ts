import type { PayloadRequest } from 'payload'

import { getTenantFeatures } from './features'

/**
 * Stores the store's effective features on the tenant (`tenants.enabledFeatures`), so screens
 * and the storefront read one field instead of recomputing plan, switches and dependencies.
 * Called whenever a switch or the plan changes.
 */
export async function syncEnabledFeatures(
  req: PayloadRequest,
  tenantId: string,
): Promise<string[]> {
  const { tenant, enabled } = await getTenantFeatures(req.payload, tenantId, req)
  const next = [...enabled].sort()
  const current = [...((tenant.enabledFeatures ?? []) as string[])].sort()
  if (JSON.stringify(next) !== JSON.stringify(current)) {
    await req.payload.update({
      collection: 'tenants',
      id: tenantId,
      data: { enabledFeatures: next as NonNullable<typeof tenant.enabledFeatures> },
      overrideAccess: true,
      req,
      context: { skipAudit: true },
    })
  }
  return next
}

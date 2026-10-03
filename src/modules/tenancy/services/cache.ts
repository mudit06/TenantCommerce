import { HOST_MAP_TAG, revalidate, tenantTag } from '@/lib/cache'

/** A domain or a store's status changed: the proxy's host map must reload (docs/04). */
export const revalidateHostMap = () => revalidate(HOST_MAP_TAG)

export const revalidateTenantFeatures = (tenantId: string) =>
  revalidate(tenantTag(tenantId, 'features'))

import { revalidateTag } from 'next/cache'

// Cache keys and tags always carry the tenant (docs/04): t:<tenantId>:...
export const tenantTag = (tenantId: string, ...parts: string[]) =>
  ['t', tenantId, ...parts].join(':')

export const HOST_MAP_TAG = 'tenant-domains'

/**
 * Revalidates a Next cache tag. Outside a Next request (scripts, jobs, tests) there is no
 * cache to revalidate, so the call is skipped rather than failing the write that triggered it.
 */
export function revalidate(tag: string): void {
  try {
    revalidateTag(tag, 'max')
  } catch {
    // Not running inside Next: nothing cached here
  }
}

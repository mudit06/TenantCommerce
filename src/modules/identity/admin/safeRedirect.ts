import { ADMIN } from '@/admin/paths'

/**
 * Where to go after signing in: an address inside the admin (never another site, never the
 * sign-in page itself), else the dashboard.
 */
export const safeRedirect = (target: unknown): string =>
  typeof target === 'string' &&
  (target === ADMIN || target.startsWith(`${ADMIN}/`) || target.startsWith(`${ADMIN}?`)) &&
  !target.startsWith(`${ADMIN}/login`)
    ? target
    : ADMIN

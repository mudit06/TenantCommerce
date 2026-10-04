import { redirect } from 'next/navigation'

import { ADMIN } from '@/admin/paths'

/**
 * Sends a signed-out visitor of one of our custom admin screens to the sign-in page, then back.
 * Payload redirects its own screens but renders custom views without a user, and it ignores the
 * session cookie on cross-site navigations (a link in an email, Slack or a browser extension), so
 * without this those screens showed "not allowed" with no menu (QA, 5 October 2026).
 */
export function requireSignedIn(user: unknown, path: string): void {
  if (!user) redirect(`${ADMIN}/login?redirect=${encodeURIComponent(path)}`)
}

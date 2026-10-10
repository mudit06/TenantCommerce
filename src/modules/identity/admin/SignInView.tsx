import type { AdminViewServerProps } from 'payload'
import { redirect } from 'next/navigation'

import { Logo } from '@/admin/graphics/Logo'

import { safeRedirect } from './safeRedirect'
import { SignInForm } from './SignInForm'

/**
 * Replaces Payload's login page (docs/screens/super-admin.md `sa-login`) so the second step can
 * follow the password on the same page. Signed-in people go straight on to the page they asked
 * for: Payload ignores the session cookie on cross-site navigations (a link in an email or
 * chat), sends them here, and the page's same-site reload then knows them (QA, 10 October 2026).
 */
export function SignInView({ initPageResult, searchParams }: AdminViewServerProps) {
  const target = searchParams?.redirect
  if (initPageResult.req.user) redirect(safeRedirect(target))
  return (
    // Payload's minimal template draws the card around this
    <div className="te-signin">
      <Logo />
      <SignInForm redirect={typeof target === 'string' ? target : null} />
    </div>
  )
}

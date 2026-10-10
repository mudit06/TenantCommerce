import { Logo } from '@/admin/graphics/Logo'
import { ADMIN } from '@/admin/paths'

import { TwoStepSetup } from './TwoStepSetup'

/**
 * Covers the platform panel until the signed-in teammate turns on two-step sign-in, which is
 * required for our team (docs/screens/super-admin.md `sa-team` rule 2). Shown by the menu, so
 * every admin page waits for it.
 */
export function TwoStepGate({ name }: { name: string }) {
  return (
    <div aria-labelledby="twostep-gate-title" aria-modal className="te-gate" role="dialog">
      <div className="te-gate__card">
        <Logo />
        <h1 className="te-signin__title" id="twostep-gate-title">
          Set up two-step sign-in
        </h1>
        <p className="te-muted">
          {name ? `${name.split(' ')[0]}, our` : 'Our'} team’s accounts can change every store, so
          each sign-in also needs a code from your phone. This takes about a minute.
        </p>
        <TwoStepSetup />
        <a className="te-link te-small" href={`${ADMIN}/logout`}>
          Sign out instead
        </a>
      </div>
    </div>
  )
}

import type { PayloadRequest } from 'payload'
import QRCode from 'qrcode'

import { idOf, isPlatformStaff, isSuperAdmin } from '@/access'
import { newTotpSecret, otpauthUrl, verifyTotp } from '@/lib/auth/totp'
import { readHiddenFields, writeHiddenFields } from '@/lib/db/atomic'
import { AppError } from '@/lib/errors'
import { decryptSecret, encryptSecret } from '@/connectors'
import { recordAudit } from '@/modules/audit'

import { LOCK_MINUTES, MAX_LOGIN_ATTEMPTS } from '../constants'

// Two-step sign-in for staff (docs/05): an authenticator app's six-digit code after the
// password. Required for our team (they set it up before using the panel), offered to vendor
// staff. The secret is sealed with the connector key scheme and never leaves the server; a lost
// phone is reset by a super admin, which is audited.

/** Thrown during sign-in when the password was right and the code is still needed. */
export const TWO_STEP_REQUIRED = 'TWO_STEP_REQUIRED' as const

const ISSUER = 'TenantEcom'

type HiddenState = {
  twoFactorSecret?: string | null
  twoFactorPending?: string | null
  twoFactorFailures?: number | null
  twoFactorLockedUntil?: Date | string | null
  twoFactorLastStep?: number | null
}

async function hiddenState(req: PayloadRequest, userId: string): Promise<HiddenState> {
  return (await readHiddenFields(req.payload, {
    collection: 'users',
    id: userId,
    fields: [
      'twoFactorSecret',
      'twoFactorPending',
      'twoFactorFailures',
      'twoFactorLockedUntil',
      'twoFactorLastStep',
    ],
  })) as HiddenState
}

const unseal = (sealed: string | null | undefined) => decryptSecret(sealed).secret ?? null

const userIdOf = (req: PayloadRequest) => {
  if (!req.user || req.user.collection !== 'users') {
    throw new AppError('UNAUTHENTICATED', 'Sign in first', 401)
  }
  return String(req.user.id)
}

/** What the sign-in check found, saved by `signInStaff` once Payload's login has finished. */
type TwoStepOutcome = { userId?: string; failed?: boolean; step?: number }

type TwoStepContext = { code?: string; outcome?: TwoStepOutcome }

/**
 * Checks the code during sign-in (Users `beforeLogin`, after the password matched). Accounts
 * without two-step pass straight through. It only reads: Payload's login transaction holds the
 * user's record, so the wrong-code count and the used step are saved by `signInStaff` after it.
 */
export async function checkTwoStepAtSignIn(
  req: PayloadRequest,
  user: { id: string | number; twoFactorEnabled?: boolean | null },
): Promise<void> {
  if (!user.twoFactorEnabled) return
  const twoStep = req.context?.twoStep as TwoStepContext | undefined
  const code = twoStep?.code ?? ''
  if (!code)
    throw new AppError(TWO_STEP_REQUIRED, 'Enter the code from your authenticator app', 401)

  const userId = String(user.id)
  const state = await hiddenState(req, userId)
  const lockedUntil = state.twoFactorLockedUntil ? new Date(state.twoFactorLockedUntil) : null
  if (lockedUntil && lockedUntil > new Date()) {
    throw new AppError(
      'LOCKED',
      `Too many wrong codes. Try again in ${LOCK_MINUTES} minutes, or ask our team to reset two-step sign-in.`,
      429,
    )
  }
  const secret = unseal(state.twoFactorSecret)
  const step = secret ? verifyTotp(secret, code) : null
  // A code is never accepted twice, nor one older than the last used
  if (step === null || (state.twoFactorLastStep ?? -1) >= step) {
    if (twoStep?.outcome) Object.assign(twoStep.outcome, { userId, failed: true })
    throw new AppError(
      'INVALID_CODE',
      'That code didn’t work. Check the time on your phone and try the newest code.',
      401,
      { code: 'That code didn’t work' },
    )
  }
  if (twoStep?.outcome) Object.assign(twoStep.outcome, { userId, step })
}

/** Saves a sign-in code's outcome: five wrong codes lock two-step for 15 minutes, like passwords. */
async function saveOutcome(req: PayloadRequest, outcome: TwoStepOutcome) {
  if (!outcome.userId) return
  if (outcome.step !== undefined) {
    await writeHiddenFields(req, {
      collection: 'users',
      id: outcome.userId,
      outsideTransaction: true,
      set: { twoFactorFailures: 0, twoFactorLockedUntil: null, twoFactorLastStep: outcome.step },
    })
    return
  }
  const state = await hiddenState(req, outcome.userId)
  const failures = (state.twoFactorFailures ?? 0) + 1
  await writeHiddenFields(req, {
    collection: 'users',
    id: outcome.userId,
    outsideTransaction: true,
    set:
      failures >= MAX_LOGIN_ATTEMPTS
        ? {
            twoFactorFailures: 0,
            twoFactorLockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000),
          }
        : { twoFactorFailures: failures },
  })
}

/**
 * Staff sign-in with the password and, when the account has two-step on, the authenticator
 * code (docs/screens `sa-login`). Payload's login does the password, lockout and session; this
 * passes the code to the Users hook and saves what it found. Returns the session token.
 */
export async function signInStaff(
  req: PayloadRequest,
  input: { email: string; password: string; code?: string },
): Promise<{ token: string } | { twoStepRequired: true }> {
  const outcome: TwoStepOutcome = {}
  req.context = { ...req.context, twoStep: { code: input.code ?? '', outcome } }
  try {
    const result = await req.payload.login({
      collection: 'users',
      data: { email: input.email, password: input.password },
      req,
    })
    if (!result.token) throw new AppError('UNAUTHENTICATED', 'Sign in again', 401)
    return { token: result.token }
  } catch (error) {
    if (error instanceof AppError && error.code === TWO_STEP_REQUIRED)
      return { twoStepRequired: true }
    throw error
  } finally {
    await saveOutcome(req, outcome)
  }
}

/** Starts setting up two-step for the signed-in person: a new secret and its QR code. */
export async function startTwoStepSetup(req: PayloadRequest) {
  const userId = userIdOf(req)
  const secret = newTotpSecret()
  await writeHiddenFields(req, {
    collection: 'users',
    id: userId,
    set: { twoFactorPending: encryptSecret({ secret }) },
  })
  const url = otpauthUrl(secret, req.user!.email ?? userId, ISSUER)
  const qrSvg = await QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' })
  return {
    // Shown in groups of four so it can be typed into an app that can't scan
    setupKey: secret.match(/.{1,4}/g)?.join(' ') ?? secret,
    qrSvg,
  }
}

/** Confirms the setup with a code from the app; from then on every sign-in asks for one. */
export async function confirmTwoStepSetup(req: PayloadRequest, code: string) {
  const userId = userIdOf(req)
  const state = await hiddenState(req, userId)
  const secret = unseal(state.twoFactorPending)
  if (!secret) throw new AppError('NOT_FOUND', 'Start the setup again', 404)
  const step = verifyTotp(secret, code)
  if (step === null) {
    throw new AppError(
      'INVALID_CODE',
      'That code didn’t work. Try the newest code in the app.',
      400,
      {
        code: 'That code didn’t work',
      },
    )
  }
  await writeHiddenFields(req, {
    collection: 'users',
    id: userId,
    set: {
      twoFactorSecret: state.twoFactorPending,
      twoFactorPending: null,
      twoFactorFailures: 0,
      twoFactorLockedUntil: null,
      twoFactorLastStep: step,
    },
  })
  await req.payload.update({
    collection: 'users',
    id: userId,
    data: { twoFactorEnabled: true, twoFactorEnabledAt: new Date().toISOString() },
    overrideAccess: true,
    req,
    context: { skipAudit: true },
  })
  await recordAudit(req, {
    action: 'two_factor_changed',
    collectionSlug: 'users',
    docId: userId,
    summary: 'Turned on two-step sign-in',
  })
}

/**
 * Turns two-step off for the signed-in person, with a current code. Our team can't: it is
 * required for platform accounts (docs/screens Team and access rule 2).
 */
export async function turnOffTwoStep(req: PayloadRequest, code: string) {
  const userId = userIdOf(req)
  if (isPlatformStaff(req.user)) {
    throw new AppError('FORBIDDEN', 'Two-step sign-in is required for our team', 403)
  }
  const state = await hiddenState(req, userId)
  const secret = unseal(state.twoFactorSecret)
  if (!secret || verifyTotp(secret, code) === null) {
    throw new AppError('INVALID_CODE', 'That code didn’t work', 400, {
      code: 'That code didn’t work',
    })
  }
  await clearTwoStep(req, userId)
  await recordAudit(req, {
    action: 'two_factor_changed',
    collectionSlug: 'users',
    docId: userId,
    summary: 'Turned off two-step sign-in',
  })
}

/**
 * Resets someone's two-step after they lose their phone (docs/screens Vendor staff rule 3):
 * super admins only, audited against each store the person works in. Our team's accounts set it
 * up again at their next sign-in.
 */
export async function resetTwoStep(req: PayloadRequest, targetId: string) {
  if (!isSuperAdmin(req.user)) throw new AppError('FORBIDDEN', 'Super admins only', 403)
  const target = await req.payload.findByID({
    collection: 'users',
    id: targetId,
    depth: 0,
    overrideAccess: true,
    req,
  })
  await clearTwoStep(req, targetId)
  const stores = (target.tenants ?? []).map((row) => idOf(row.tenant)).filter(Boolean) as string[]
  for (const tenant of stores.length ? stores : [null]) {
    await recordAudit(req, {
      action: 'two_factor_reset',
      tenant,
      collectionSlug: 'users',
      docId: targetId,
      summary: `Reset two-step sign-in for ${target.name}`,
    })
  }
}

async function clearTwoStep(req: PayloadRequest, userId: string) {
  await writeHiddenFields(req, {
    collection: 'users',
    id: userId,
    set: {
      twoFactorSecret: null,
      twoFactorPending: null,
      twoFactorFailures: 0,
      twoFactorLockedUntil: null,
      twoFactorLastStep: null,
    },
  })
  await req.payload.update({
    collection: 'users',
    id: userId,
    data: { twoFactorEnabled: false, twoFactorEnabledAt: null },
    overrideAccess: true,
    req,
    context: { skipAudit: true },
  })
}

/** Our team must have two-step before using the panel (docs/05). */
export const mustSetUpTwoStep = (user: unknown) =>
  isPlatformStaff(user) && !(user as { twoFactorEnabled?: boolean | null } | null)?.twoFactorEnabled

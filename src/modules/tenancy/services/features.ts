import type { Payload, PayloadRequest } from 'payload'

import { isSuperAdmin } from '@/access'
import { AppError } from '@/lib/errors'
import type { FeatureGroup, FeaturePhase } from '@/lib/features'
import { recordAudit } from '@/modules/audit'
import {
  defaultFeatureConfig,
  dependentsOf,
  FEATURES,
  getFeature,
  isFeatureAvailable,
  type FeatureKey,
} from '@/modules/features'
import type { FeatureFlag, Plan, Tenant } from '@/payload-types'

import type { Industry } from '../constants'
import { startingFeatures } from '../presets'

export type FeatureState = {
  key: FeatureKey
  /** The feature-flags document, once one exists for this store. */
  flagId: string | null
  label: string
  description?: string
  group: FeatureGroup
  phase: FeaturePhase
  /** Its module exists in code (Phase 2 rows stay locked until then). */
  available: boolean
  inPlan: boolean
  /** The switch itself. */
  on: boolean
  /** Switch on, in plan, available and every dependency enabled: what the store gets. */
  enabled: boolean
  dependsOn: FeatureKey[]
  hasConfig: boolean
  config: Record<string, unknown> | null
  platformConfigKeys: string[]
}

/**
 * The features a store actually has: plan allows it AND the switch is on AND (docs/08) every
 * feature it depends on is enabled too.
 */
export function effectiveFeatures(
  allowedModules: readonly string[],
  switchedOn: ReadonlySet<string>,
): Set<FeatureKey> {
  const memo = new Map<FeatureKey, boolean>()
  const enabled = (key: FeatureKey, seen: Set<FeatureKey>): boolean => {
    const cached = memo.get(key)
    if (cached !== undefined) return cached
    if (seen.has(key)) return false
    seen.add(key)
    const feature = getFeature(key)
    const result =
      isFeatureAvailable(key) &&
      allowedModules.includes(key) &&
      switchedOn.has(key) &&
      (feature.dependsOn ?? []).every((dep) => enabled(dep as FeatureKey, seen))
    memo.set(key, result)
    return result
  }
  return new Set(FEATURES.map((feature) => feature.key).filter((key) => enabled(key, new Set())))
}

type Loaded = { tenant: Tenant; plan: Plan | null; flags: FeatureFlag[] }

async function load(payload: Payload, tenantId: string, req?: PayloadRequest): Promise<Loaded> {
  const tenant = await payload
    .findByID({ collection: 'tenants', id: tenantId, depth: 1, overrideAccess: true, req })
    .catch(() => null)
  if (!tenant) throw new AppError('NOT_FOUND', 'Store not found', 404)
  const plan = tenant.plan && typeof tenant.plan === 'object' ? tenant.plan : null
  const { docs: flags } = await payload.find({
    collection: 'feature-flags',
    where: { tenant: { equals: tenantId } },
    depth: 0,
    limit: 200,
    pagination: false,
    overrideAccess: true,
    req,
  })
  return { tenant, plan, flags }
}

export async function getTenantFeatures(
  payload: Payload,
  tenantId: string,
  req?: PayloadRequest,
): Promise<{
  tenant: Tenant
  plan: Plan | null
  states: FeatureState[]
  enabled: Set<FeatureKey>
}> {
  const { tenant, plan, flags } = await load(payload, tenantId, req)
  const allowed = (plan?.allowedModules ?? []) as string[]
  const byKey = new Map(flags.map((flag) => [flag.key, flag]))
  const switchedOn = new Set(flags.filter((flag) => flag.enabled).map((flag) => flag.key))
  const enabled = effectiveFeatures(allowed, switchedOn)
  const states = FEATURES.map<FeatureState>((feature) => {
    const flag = byKey.get(feature.key)
    return {
      key: feature.key,
      flagId: flag ? String(flag.id) : null,
      label: feature.label,
      description: feature.description,
      group: feature.group,
      phase: feature.phase,
      available: isFeatureAvailable(feature.key),
      inPlan: allowed.includes(feature.key),
      on: Boolean(flag?.enabled),
      enabled: enabled.has(feature.key),
      dependsOn: (feature.dependsOn ?? []) as FeatureKey[],
      hasConfig: Boolean(feature.configSchema),
      config:
        (flag?.config as Record<string, unknown> | null | undefined) ??
        defaultFeatureConfig(feature.key),
      platformConfigKeys: [...(feature.platformConfigKeys ?? [])],
    }
  })
  return { tenant, plan, states, enabled }
}

/** Server-side check for optional features (CLAUDE.md rule 4). */
export async function isFeatureEnabled(
  payload: Payload,
  tenantId: string,
  key: FeatureKey,
): Promise<boolean> {
  const { enabled } = await getTenantFeatures(payload, tenantId)
  return enabled.has(key)
}

/**
 * A switched-on feature's settings (its defaults filled in), or null when the feature is off.
 * Server code reads limits from here, never from the browser (docs/08).
 */
export async function featureConfig<T = Record<string, unknown>>(
  payload: Payload,
  tenantId: string,
  key: FeatureKey,
  req?: PayloadRequest,
): Promise<T | null> {
  const { states } = await getTenantFeatures(payload, tenantId, req)
  const state = states.find((s) => s.key === key)
  if (!state?.enabled) return null
  const schema = getFeature(key).configSchema
  const parsed = schema?.safeParse(state.config ?? {})
  return (parsed?.success ? parsed.data : (state.config ?? {})) as T
}

/** For endpoints: a switched-off feature answers "not found" (docs/08). */
export async function requireFeature(
  payload: Payload,
  tenantId: string,
  key: FeatureKey,
): Promise<void> {
  if (!(await isFeatureEnabled(payload, tenantId, key))) {
    throw new AppError('FEATURE_DISABLED', 'Not found', 404)
  }
}

/** Used by the feature-flags hook: may this store switch `key` on right now? */
export async function assertCanEnable(
  req: PayloadRequest,
  { tenantId, key }: { tenantId: string; key: FeatureKey },
): Promise<void> {
  const feature = getFeature(key)
  if (!isFeatureAvailable(key)) {
    throw new AppError('FEATURE_NOT_AVAILABLE', `${feature.label} arrives in Phase 2`, 422)
  }
  const { plan, flags } = await load(req.payload, tenantId, req)
  if (!((plan?.allowedModules ?? []) as string[]).includes(key)) {
    throw new AppError(
      'FEATURE_NOT_IN_PLAN',
      `${feature.label} is not in the ${plan?.name ?? 'current'} plan. Change the plan first.`,
      422,
    )
  }
  const on = new Set(flags.filter((flag) => flag.enabled).map((flag) => flag.key))
  const missing = (feature.dependsOn ?? []).filter((dep) => !on.has(dep as FeatureKey))
  if (missing.length > 0) {
    throw new AppError(
      'FEATURE_DEPENDENCY',
      `${feature.label} needs ${missing.map((dep) => getFeature(dep).label).join(' and ')}`,
      409,
      { dependsOn: missing.join(',') },
    )
  }
}

async function writeSwitch(
  req: PayloadRequest,
  tenantId: string,
  key: FeatureKey,
  enabled: boolean,
  existing: FeatureFlag | undefined,
): Promise<void> {
  if (existing) {
    if (Boolean(existing.enabled) === enabled) return
    await req.payload.update({
      collection: 'feature-flags',
      id: existing.id,
      data: { enabled },
      overrideAccess: true,
      req,
    })
    return
  }
  await req.payload.create({
    collection: 'feature-flags',
    data: { tenant: tenantId, key, enabled, config: defaultFeatureConfig(key) },
    overrideAccess: true,
    req,
  })
}

/** Dependencies first when switching on, dependents first when switching off. */
const depth = (key: string, seen = new Set<string>()): number => {
  if (seen.has(key)) return 0
  seen.add(key)
  const deps = getFeature(key).dependsOn ?? []
  return deps.length === 0 ? 0 : 1 + Math.max(...deps.map((dep) => depth(dep, seen)))
}

/**
 * Switches one feature for one store (super admin, Features tab). With `cascade`, switching on
 * also switches on what it needs, and switching off also switches off what needs it; without
 * it a dependency problem is returned so the UI can ask first (docs/screens Vendor features).
 */
export async function setFeature(
  req: PayloadRequest,
  input: { tenantId: string; key: FeatureKey; enabled: boolean; cascade?: boolean },
): Promise<FeatureState[]> {
  if (req.user && !isSuperAdmin(req.user)) {
    throw new AppError('FORBIDDEN', 'Only super admins switch features', 403)
  }
  const { tenantId, key, enabled, cascade = false } = input
  const { flags } = await load(req.payload, tenantId, req)
  const byKey = new Map(flags.map((flag) => [flag.key as FeatureKey, flag]))
  const isOn = (k: FeatureKey) => Boolean(byKey.get(k)?.enabled)

  if (enabled) {
    const needed = new Set<FeatureKey>()
    const collect = (k: FeatureKey) => {
      for (const dep of (getFeature(k).dependsOn ?? []) as FeatureKey[]) {
        if (!isOn(dep) && !needed.has(dep)) {
          needed.add(dep)
          collect(dep)
        }
      }
    }
    collect(key)
    if (needed.size > 0 && !cascade) {
      throw new AppError(
        'FEATURE_DEPENDENCY',
        `${getFeature(key).label} needs ${[...needed].map((k) => getFeature(k).label).join(' and ')}. Switch both on?`,
        409,
        { dependsOn: [...needed].join(',') },
      )
    }
    for (const k of [...needed, key].sort((a, b) => depth(a) - depth(b))) {
      await writeSwitch(req, tenantId, k, true, byKey.get(k))
    }
  } else {
    const affected = new Set<FeatureKey>()
    const collect = (k: FeatureKey) => {
      for (const dependent of dependentsOf(k)) {
        if (isOn(dependent) && !affected.has(dependent)) {
          affected.add(dependent)
          collect(dependent)
        }
      }
    }
    collect(key)
    if (affected.size > 0 && !cascade) {
      throw new AppError(
        'FEATURE_DEPENDENCY',
        `${[...affected].map((k) => getFeature(k).label).join(' and ')} need ${getFeature(key).label}. Switch them off too?`,
        409,
        { dependents: [...affected].join(',') },
      )
    }
    for (const k of [key, ...affected].sort((a, b) => depth(b) - depth(a))) {
      await writeSwitch(req, tenantId, k, false, byKey.get(k))
    }
  }
  return (await getTenantFeatures(req.payload, tenantId, req)).states
}

/**
 * Creates every available feature switch for a new store, on or off (onboarding). `overrides`
 * are the New vendor form's toggles; they cannot reach beyond the plan or the current phase.
 */
export async function seedTenantFeatures(
  req: PayloadRequest,
  input: {
    tenantId: string
    industries: readonly Industry[]
    allowedModules: readonly string[]
    overrides?: Partial<Record<FeatureKey, boolean>>
  },
): Promise<Record<FeatureKey, boolean>> {
  const wanted = startingFeatures(input.industries, input.allowedModules)
  for (const [key, value] of Object.entries(input.overrides ?? {}) as [FeatureKey, boolean][]) {
    wanted[key] = value && input.allowedModules.includes(key) && isFeatureAvailable(key)
  }
  // Drop anything whose dependency ended up off
  for (const feature of FEATURES) {
    if (wanted[feature.key] && feature.dependsOn?.some((dep) => !wanted[dep as FeatureKey])) {
      wanted[feature.key] = false
    }
  }
  const keys = FEATURES.filter((feature) => isFeatureAvailable(feature.key))
    .map((feature) => feature.key)
    .sort((a, b) => depth(a) - depth(b))
  for (const key of keys) {
    await req.payload.create({
      collection: 'feature-flags',
      data: {
        tenant: input.tenantId,
        key,
        enabled: wanted[key],
        config: defaultFeatureConfig(key),
      },
      overrideAccess: true,
      req,
      context: { skipFeatureAudit: true },
    })
  }
  return wanted
}

/** Re-apply the industry preset: a deliberate action from the Features tab (docs/screens). */
export async function applyIndustryPreset(
  req: PayloadRequest,
  tenantId: string,
): Promise<FeatureState[]> {
  if (req.user && !isSuperAdmin(req.user)) {
    throw new AppError('FORBIDDEN', 'Only super admins re-apply presets', 403)
  }
  const { tenant, plan, flags } = await load(req.payload, tenantId, req)
  const wanted = startingFeatures(
    (tenant.industry ?? []) as Industry[],
    (plan?.allowedModules ?? []) as string[],
  )
  const byKey = new Map(flags.map((flag) => [flag.key as FeatureKey, flag]))
  const available = FEATURES.filter((feature) => isFeatureAvailable(feature.key)).map((f) => f.key)
  for (const key of [...available].sort((a, b) => depth(b) - depth(a))) {
    if (!wanted[key]) await writeSwitch(req, tenantId, key, false, byKey.get(key))
  }
  for (const key of [...available].sort((a, b) => depth(a) - depth(b))) {
    if (wanted[key]) await writeSwitch(req, tenantId, key, true, byKey.get(key))
  }
  await req.payload.update({
    collection: 'tenants',
    id: tenantId,
    data: { presetAppliedAt: new Date().toISOString() },
    overrideAccess: true,
    req,
  })
  await recordAudit(req, {
    action: 'feature_changed',
    tenant: tenantId,
    summary: `Re-applied the ${(tenant.industry ?? []).join(' + ')} preset`,
  })
  return (await getTenantFeatures(req.payload, tenantId, req)).states
}

/**
 * A plan lost some features: switch them off for every store on that plan. Data is kept, so
 * switching back on restores it (docs/screens Plans rule 3).
 */
export async function switchOffFeaturesOutsidePlan(
  req: PayloadRequest,
  { planId, keys }: { planId: string; keys: readonly string[] },
): Promise<number> {
  const { docs: tenants } = await req.payload.find({
    collection: 'tenants',
    where: { plan: { equals: planId } },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  let switched = 0
  for (const tenant of tenants) {
    const tenantId = String(tenant.id)
    const { flags } = await load(req.payload, tenantId, req)
    const off = new Set<string>(keys)
    // Anything depending on a removed feature goes off too
    for (const key of keys) for (const dependent of dependentsOf(key)) off.add(dependent)
    for (const flag of flags) {
      if (flag.enabled && off.has(flag.key)) {
        await req.payload.update({
          collection: 'feature-flags',
          id: flag.id,
          data: { enabled: false },
          overrideAccess: true,
          req,
        })
        switched += 1
      }
    }
  }
  return switched
}

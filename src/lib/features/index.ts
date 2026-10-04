import type { z } from 'zod'

// A module declares its optional features in its own `feature.ts` (docs/08). Feature files hold
// data only (this helper and zod), so the registry can import them without import cycles.

export type FeaturePhase = 'mvp' | 'phase-2'

/** Sections of the super admin Features tab. */
export type FeatureGroup = 'mvp' | 'growth' | 'phase-2'

export type FeatureDefinition = {
  key: string
  label: string
  /** One line under the label on the Features tab. */
  description?: string
  /** Owning module folder under src/modules. */
  module: string
  phase: FeaturePhase
  group: FeatureGroup
  /** Switched on for a new store unless its plan or industry preset says otherwise. */
  defaultOn: boolean
  dependsOn?: readonly string[]
  /** Validates `feature-flags.config`; parsing `{}` must give the defaults. */
  configSchema?: z.ZodType<Record<string, unknown>>
  /** Config keys only platform admins may change (docs/08 "platform" caps). */
  platformConfigKeys?: readonly string[]
}

export const defineFeatures = <const T extends readonly FeatureDefinition[]>(features: T) =>
  features

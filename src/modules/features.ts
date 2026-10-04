import type { FeatureDefinition } from '@/lib/features'

import { features as affiliate } from './affiliate/feature'
import { features as b2b } from './b2b/feature'
import { features as cart } from './cart/feature'
import { features as catalog } from './catalog/feature'
import { features as content } from './content/feature'
import { features as dealers } from './dealers/feature'
import { features as enquiries } from './enquiries/feature'
import { features as loyalty } from './loyalty/feature'
import { features as notifications } from './notifications/feature'
import { features as orders } from './orders/feature'
import { features as payments } from './payments/feature'
import { features as promotions } from './promotions/feature'
import { features as reviews } from './reviews/feature'
import { features as shipping } from './shipping/feature'
import { features as spareParts } from './spare-parts/feature'
import { features as warranty } from './warranty/feature'

// Feature registry (docs/08 "Adding a module", step 3). The one place allowed to import each
// module's feature.ts directly: those files are declarations with no imports of their own.
const ALL = [
  ...orders,
  ...payments,
  ...enquiries,
  ...catalog,
  ...dealers,
  ...content,
  ...shipping,
  ...promotions,
  ...reviews,
  ...notifications,
  ...cart,
  ...affiliate,
  ...warranty,
  ...spareParts,
  ...b2b,
  ...loyalty,
] as const

export type FeatureKey = (typeof ALL)[number]['key']

export const FEATURES: readonly (FeatureDefinition & { key: FeatureKey })[] = ALL

export const FEATURE_KEYS = FEATURES.map((feature) => feature.key)

const BY_KEY = new Map<string, FeatureDefinition & { key: FeatureKey }>(
  FEATURES.map((feature) => [feature.key, feature]),
)

export const isFeatureKey = (value: string): value is FeatureKey => BY_KEY.has(value)

export function getFeature(key: string): FeatureDefinition & { key: FeatureKey } {
  const feature = BY_KEY.get(key)
  if (!feature) throw new Error(`Unknown feature key "${key}"`)
  return feature
}

/** Features whose module exists in code. Phase 2 switches stay locked until their phase ships. */
export const AVAILABLE_PHASES: readonly FeatureDefinition['phase'][] = ['mvp']

export const isFeatureAvailable = (key: string) => AVAILABLE_PHASES.includes(getFeature(key).phase)

/** Features that need `key` to be on (abandoned-cart needs offer-messages...). */
export const dependentsOf = (key: string) =>
  FEATURES.filter((feature) => feature.dependsOn?.includes(key)).map((feature) => feature.key)

/** Defaults for a feature's config (its schema parsed from `{}`). */
export function defaultFeatureConfig(key: string): Record<string, unknown> | null {
  const schema = getFeature(key).configSchema
  return schema ? schema.parse({}) : null
}

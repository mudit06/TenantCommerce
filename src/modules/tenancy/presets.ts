import { FEATURES, isFeatureAvailable, type FeatureKey } from '@/modules/features'

import type { Industry } from './constants'

// Industry presets (docs/08): flags switched on (or off) on top of each feature's default when
// a store is created. Phase 2 keys are listed so the preset is complete; they only take effect
// once their phase ships (isFeatureAvailable).
type Preset = { on: readonly FeatureKey[]; off?: readonly FeatureKey[] }

export const INDUSTRY_PRESETS: Record<Industry, Preset> = {
  sanitary: {
    on: [
      'downloads',
      'product-videos',
      'enquire-only-products',
      'dealer-locator',
      'warranty',
      'service-requests',
      'spare-parts',
      'compare',
      'appointments',
      'b2b',
    ],
  },
  locks: {
    on: [
      'downloads',
      'product-videos',
      'dealer-locator',
      'installation-booking',
      'warranty',
      'service-requests',
      'compare',
      'blog',
      'b2b',
    ],
  },
  hardware: {
    on: [
      'downloads',
      'enquire-only-products',
      'dealer-locator',
      'affiliate',
      'b2b',
      'trade-schemes',
      'loyalty',
      'compare',
    ],
  },
  decor: {
    on: [
      'dealer-locator',
      'affiliate',
      'lookbook',
      'appointments',
      'blog',
      'cod-confirmation',
      'loyalty',
      'b2b',
    ],
  },
  clothing: {
    on: ['size-guide', 'dealer-locator', 'affiliate', 'cod-confirmation', 'loyalty'],
    off: ['enquiries', 'product-videos'],
  },
  other: { on: [] },
}

/**
 * The switches a new store starts with, given its industries and its plan's allowed modules.
 * A store in several industries gets a feature when any of them turns it on; a default-on
 * feature goes off only when every chosen industry turns it off.
 */
export function startingFeatures(
  industries: readonly Industry[],
  allowedModules: readonly string[],
): Record<FeatureKey, boolean> {
  const presets = (industries.length > 0 ? industries : (['other'] as const)).map(
    (industry) => INDUSTRY_PRESETS[industry],
  )
  const result = {} as Record<FeatureKey, boolean>
  for (const feature of FEATURES) {
    const turnedOn = presets.some((preset) => preset.on.includes(feature.key))
    const turnedOffByAll = presets.every((preset) => preset.off?.includes(feature.key))
    const wanted = turnedOn || (feature.defaultOn && !turnedOffByAll)
    result[feature.key] =
      wanted && allowedModules.includes(feature.key) && isFeatureAvailable(feature.key)
  }
  // A feature whose dependency stays off can't start on either
  for (const feature of FEATURES) {
    if (result[feature.key] && feature.dependsOn?.some((dep) => !result[dep as FeatureKey])) {
      result[feature.key] = false
    }
  }
  return result
}

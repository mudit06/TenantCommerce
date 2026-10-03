import { describe, expect, it } from 'vitest'

import { defaultFeatureConfig, FEATURES, FEATURE_KEYS, getFeature } from '@/modules/features'
import { effectiveFeatures } from '@/modules/tenancy/services/features'
import { INDUSTRY_PRESETS, startingFeatures } from '@/modules/tenancy/presets'

import { PLANS } from '../../scripts/seedData'

const plan = (code: string) => PLANS.find((p) => p.code === code)!.allowedModules as string[]
const on = (switches: Record<string, boolean>) =>
  Object.entries(switches)
    .filter(([, value]) => value)
    .map(([key]) => key)
    .sort()

describe('feature registry (docs/08)', () => {
  it('has unique keys and dependencies that exist', () => {
    expect(new Set(FEATURE_KEYS).size).toBe(FEATURE_KEYS.length)
    for (const feature of FEATURES) {
      for (const dep of feature.dependsOn ?? []) expect(FEATURE_KEYS).toContain(dep)
    }
  })

  it('every config schema parses {} into its documented defaults', () => {
    expect(defaultFeatureConfig('affiliate')).toEqual({
      defaultCommissionPercent: 5,
      cookieDays: 30,
      minPayoutMinor: 50_000,
      autoApproveApplications: false,
    })
    expect(defaultFeatureConfig('offer-messages')).toMatchObject({
      maxPerShopperPerWeek: 2,
      maxPerShopperPerWeekCap: 3,
      maxRecipientsPerCampaign: 20_000,
    })
    for (const feature of FEATURES) {
      if (feature.configSchema) expect(() => feature.configSchema!.parse({})).not.toThrow()
    }
  })

  it('platform caps cannot be exceeded by the vendor setting', () => {
    const schema = getFeature('offer-messages').configSchema!
    expect(schema.safeParse({ maxPerShopperPerWeek: 5 }).success).toBe(false)
  })

  it('presets only name real feature keys', () => {
    for (const preset of Object.values(INDUSTRY_PRESETS)) {
      for (const key of [...preset.on, ...(preset.off ?? [])]) expect(FEATURE_KEYS).toContain(key)
    }
  })
})

describe('starting features for a new store', () => {
  it('hardware on Enterprise: defaults plus the preset, 16 on (super admin New vendor screen)', () => {
    const switches = startingFeatures(['hardware'], plan('enterprise'))
    expect(switches.affiliate).toBe(true)
    expect(switches['enquire-only-products']).toBe(true)
    expect(switches['dealer-locator']).toBe(true)
    expect(switches['whatsapp-offers']).toBe(false)
    expect(on(switches)).toHaveLength(16)
  })

  it('the plan caps the preset: hardware on Starter gets no affiliate program', () => {
    expect(startingFeatures(['hardware'], plan('starter')).affiliate).toBe(false)
  })

  it('clothing switches enquiries and product videos off', () => {
    const switches = startingFeatures(['clothing'], plan('enterprise'))
    expect(switches.enquiries).toBe(false)
    expect(switches['product-videos']).toBe(false)
    expect(switches['size-guide']).toBe(true)
  })

  it('a default-on feature stays on unless every chosen industry turns it off', () => {
    expect(startingFeatures(['clothing', 'decor'], plan('enterprise')).enquiries).toBe(true)
  })

  it('never starts Phase 2 modules, even when plan and preset include them', () => {
    const switches = startingFeatures(['sanitary'], plan('enterprise'))
    expect(switches.warranty).toBe(false)
    expect(switches.b2b).toBe(false)
  })

  it('drops a feature whose dependency is not in the plan', () => {
    const withoutOffers = plan('enterprise').filter((key) => key !== 'offer-messages')
    expect(startingFeatures(['decor'], withoutOffers)['abandoned-cart']).toBe(false)
  })
})

describe('effective features: plan AND switch AND dependencies', () => {
  it('needs the plan and the switch', () => {
    const enabled = effectiveFeatures(['coupons'], new Set(['coupons', 'schemes']))
    expect(enabled.has('coupons')).toBe(true)
    expect(enabled.has('schemes')).toBe(false)
  })

  it('a switched-on feature waits for its dependency', () => {
    const allowed = ['abandoned-cart', 'offer-messages']
    expect(effectiveFeatures(allowed, new Set(['abandoned-cart'])).has('abandoned-cart')).toBe(
      false,
    )
    expect(
      effectiveFeatures(allowed, new Set(['abandoned-cart', 'offer-messages'])).has(
        'abandoned-cart',
      ),
    ).toBe(true)
  })
})

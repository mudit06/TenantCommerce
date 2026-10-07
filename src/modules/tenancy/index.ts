// Public API of the tenancy module (docs/01: other modules import only this file).
export { FeatureFlags } from './collections/FeatureFlags'
export { Plans } from './collections/Plans'
export { Subscriptions } from './collections/Subscriptions'
export { TenantDomains } from './collections/TenantDomains'
export { Tenants } from './collections/Tenants'
export * from './constants'
export { tenancyEndpoints } from './endpoints'
export { checkSubscriptionsTask } from './jobs/checkSubscriptions'
export { INDUSTRY_PRESETS, startingFeatures } from './presets'
export { onboardingSchema, type OnboardingInput } from './schemas'
export {
  amountDueMinor,
  effectiveStatus,
  monthlyRecurringMinor,
  planPriceMinor,
  summarizeBilling,
} from './services/billing'
export {
  applyIndustryPreset,
  effectiveFeatures,
  featureConfig,
  getTenantFeatures,
  isFeatureEnabled,
  requireFeature,
  setFeature,
  type FeatureState,
} from './services/features'
export { createTenant, subdomainFor, type OnboardingResult } from './services/onboarding'
export {
  changeSubscriptionPlan,
  changeSubscriptionStatus,
  recordSubscriptionPayment,
  refreshSubscriptionStatuses,
} from './services/subscriptions'
export { featureGatedAccess, hiddenWithoutFeature, userHasFeature } from './services/featureAccess'
export { syncEnabledFeatures } from './services/featureSync'
export { changeTenantStatus } from './services/tenantStatus'
export {
  adjustStorageUsage,
  assertProductCapacity,
  assertStorageAvailable,
  planLimitsOf,
  setProductCount,
} from './services/usage'

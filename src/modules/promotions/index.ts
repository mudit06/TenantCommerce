// Public API of the promotions module (docs/01): schemes, coupons and the engine.
export { CouponRedemptions } from './collections/CouponRedemptions'
export { Coupons } from './collections/Coupons'
export { Schemes } from './collections/Schemes'
export { promotionEndpoints } from './endpoints'
export { registerPromotionEvents } from './events'
export { schemeStatsTask, switchSchemesTask } from './jobs/schemes'
export { COUPON_STATUSES, OCCASIONS, SCHEME_STATUSES, occasionOf } from './occasions'
export {
  COUPON_TYPES,
  describeCoupon,
  describeScheme,
  normalizeCode,
  SCHEME_TYPES,
  schemeUnitPrice,
  type CouponRule,
  type SchemeRule,
} from './rules'
export {
  applyPromotions,
  liveSchemes,
  type AppliedOffer,
  type PromotionContext,
  type PromotionLine,
  type PromotionsResult,
} from './services/engine'
export { categoryAncestors, couponRule, liveSchemeDocs, schemeRule } from './services/load'
export { refreshSchemeStats } from './services/stats'

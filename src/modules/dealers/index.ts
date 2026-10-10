// Public API of the dealers module (docs/01)
export { Dealers } from './collections/Dealers'
export {
  distanceKm,
  rankDealers,
  type DealerPoint,
  type DealerQuery,
  type RankedDealer,
} from './rules'
export { positionForPincode, type Position } from './services/position'

// Public API of the shipping module (docs/01): zones and rate card, parcels, pincode directory.
export { Pincodes } from './collections/Pincodes'
export { Shipments } from './collections/Shipments'
export { ShippingZones } from './collections/ShippingZones'
export * from './constants'
export {
  deliveryQuote,
  storeZones,
  type DeliveryInput,
  type LiveRateSource,
  type StoreDeliveryQuote,
} from './services/delivery'
export {
  lookupPincode,
  PINCODE_PATTERN,
  stateFromPincodePrefix,
  type PincodeInfo,
} from './services/pincodes'
export {
  quoteFromRateCard,
  rateCardFee,
  zoneForPincode,
  type DeliveryQuote,
  type ZoneLike,
} from './services/rateCard'

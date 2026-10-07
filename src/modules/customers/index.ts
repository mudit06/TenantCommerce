// Public API of the customers module (docs/01): shopper accounts, sign-in, sessions, saved
// addresses and privacy requests (ADR 0003).
export { Addresses } from './collections/Addresses'
export { Customers } from './collections/Customers'
export { CustomerSessions } from './collections/CustomerSessions'
export { LoginCodes } from './collections/LoginCodes'
export { PrivacyRequests } from './collections/PrivacyRequests'
export * from './constants'
export { customerEndpoints } from './endpoints'
export { registerCustomerEvents } from './events'
export { cleanupCustomerAuthTask } from './jobs/cleanup'
export {
  addressSchema,
  completeProfileFromOrder,
  customerAddresses,
  customerOrder,
  customerOrders,
  deleteAddress,
  hasPassword,
  loginWithPassword,
  passwordSchema,
  profileSchema,
  refreshCustomerStats,
  rememberCheckoutAddress,
  saveAddress,
  setPassword,
  syncMarketingMirror,
  updateProfile,
  withoutSecrets,
  type AddressInput,
} from './services/account'
export { emailSchema, maskedEmail, sendLoginCode, verifyLoginCode } from './services/codes'
export {
  createSession,
  readSession,
  revokeAllSessions,
  revokeSession,
  type ShopperSession,
} from './services/sessions'

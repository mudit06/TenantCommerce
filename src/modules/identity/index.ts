// Public API of the identity module (docs/01: other modules import only this file).
export { Users } from './collections/Users'
export { identityEndpoints } from './endpoints'
export {
  inviteInputSchema,
  inviteStaff,
  resendInvite,
  type InviteInput,
  type InviteResult,
} from './services/invites'
export { changeStaffRoles, removeFromStore } from './services/membership'
export {
  endStoreSession,
  startStoreSession,
  type StartStoreSessionInput,
  type StoreSessionResult,
} from './services/storeSession'
export { INVITE_VALID_HOURS, MIN_PASSWORD_LENGTH } from './constants'

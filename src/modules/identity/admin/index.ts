// Admin components the identity module offers other modules' screens.
export { InviteForm } from './InviteForm'
export { InviteToggle } from './InviteToggle'
export { ResendInviteButton } from './ResendInviteButton'
export { StaffTable } from './StaffTable'
export { StoreStaffView } from './StoreStaffView'
export { TwoStepGate } from './TwoStepGate'
// The rule itself lives in the service; screens ask it here
export { mustSetUpTwoStep } from '../services/twoStep'

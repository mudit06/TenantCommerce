// Public API of the notifications module (docs/18). Other modules emit events; screens and the
// storefront use these. The endpoints are imported by payload.config directly.
export { ContactPreferences } from './collections/ContactPreferences'
export { NotificationLogs } from './collections/NotificationLogs'
export { NotificationSettings } from './collections/NotificationSettings'
export { NotificationTemplates } from './collections/NotificationTemplates'
export { registerNotificationEvents } from './events'
export { cleanupNotificationLogsTask } from './jobs/cleanup'
export { sendNotificationTask } from './jobs/send'
export {
  CHANNEL_LABELS,
  MILESTONES,
  SKIP_REASONS,
  TEMPLATE_STATUSES,
  type MilestoneKey,
} from './milestones'
export { maskedPhone } from './rules'
export { orderMessageFootnote, orderMessages, type MessageRow } from './services/messages'
export {
  offersAgreed,
  preferenceFor,
  setOfferConsent,
  setWhatsAppUpdates,
  whatsappStopped,
  type OfferChannel,
} from './services/preferences'
export {
  PREPARED_KINDS,
  queuePreparedEmail,
  type PreparedEmail,
  type PreparedKind,
} from './services/prepared'
export { loadSettings } from './services/settings'
export { storeFacts, type StoreFacts } from './services/store'
export {
  setTrackingUpdates,
  TRACKING_CODE,
  trackingView,
  type TrackingView,
} from './services/tracking'

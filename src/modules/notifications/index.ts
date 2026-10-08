// Public API of the notifications module (docs/18). Other modules emit events; screens and the
// storefront use these. The endpoints are imported by payload.config directly.
export { ContactPreferences } from './collections/ContactPreferences'
export { CAMPAIGN_STATUSES, OfferCampaigns } from './collections/OfferCampaigns'
export { sendCampaignsTask } from './jobs/campaigns'
export { cancelSchemeMessage, scheduleSchemeMessage } from './services/campaigns'
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
export { isMarketingKey, MARKETING_KEYS, MARKETING_TEMPLATES, type MarketingKey } from './marketing'
export {
  insideWindow,
  offerConfig,
  offersThisWeek,
  readUnsubscribeToken,
  unsubscribeToken,
  type OfferConfig,
} from './services/offers'
export {
  PREPARED_KINDS,
  queuePreparedEmail,
  queuePreparedWhatsApp,
  type PreparedEmail,
  type PreparedKind,
  type SendCheck,
} from './services/prepared'
export { loadSettings } from './services/settings'
export { storeFacts, type StoreFacts } from './services/store'
export {
  setTrackingUpdates,
  TRACKING_CODE,
  trackingView,
  type TrackingView,
} from './services/tracking'

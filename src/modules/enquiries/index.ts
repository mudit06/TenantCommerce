// Public API of the enquiries module (docs/01)
export { Enquiries } from './collections/Enquiries'
export { ENQUIRY_STATUSES, ENQUIRY_TABS, ENQUIRY_TYPES, type EnquiryStatus } from './constants'
export { mailtoLink, replyText, whatsappLink, whatsappNumber } from './services/reply'

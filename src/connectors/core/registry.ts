import { whatsappMeta } from '../messaging/whatsapp-meta'
import { razorpay } from '../payment/razorpay'
import { shiprocket } from '../shipping/shiprocket'
import type { ConnectorProviderKey } from './providers'
import type { ConnectorImplementation } from './types'

// Provider key -> its code (docs/09 "Adding a connector", step 2). Providers without code yet
// (SMS) can be listed and allowed but not connected.
export const CONNECTOR_IMPLEMENTATIONS: Partial<
  Record<ConnectorProviderKey, ConnectorImplementation>
> = {
  razorpay,
  shiprocket,
  'meta-whatsapp': whatsappMeta,
}

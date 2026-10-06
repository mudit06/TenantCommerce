// Provider keys for connector-configs.provider and plans.allowedConnectors (docs/09), with what
// each one needs from the vendor. Data only, safe in the browser: the setup forms are drawn from
// `fields`, and the server checks the same list (src/connectors/core/service.ts).

export type ConnectorField = {
  key: string
  label: string
  /** Stored encrypted, write-only: "Saved · hidden" + Replace (docs/screens rules) */
  secret?: boolean
  required?: boolean
  placeholder?: string
  help?: string
  /** Regular expression the value must match, with the message shown when it doesn't */
  pattern?: { source: string; message: string }
  options?: readonly { value: string; label: string }[]
}

export type ConnectorProvider = {
  key: string
  label: string
  kind: 'payment' | 'shipping' | 'messaging'
  /** `later`: shown locked on the Connectors tab (SMS waits, mudit 6 October 2026) */
  phase: 'mvp' | 'later'
  /** Test and live keys (Razorpay) */
  hasModes?: boolean
  /** Works without keys (manual shipping) */
  alwaysOn?: boolean
  /** Our webhook address is /api/webhooks/<path>/<tenantId> */
  webhookPath?: string
  /** Events the vendor ticks in the provider's dashboard */
  webhookEvents?: readonly string[]
  /** How the provider proves a webhook is real: its own signing secret, or a token we generate */
  webhookAuth?: 'signature' | 'token'
  /**
   * We make a token the vendor pastes into the provider's panel: Shiprocket and MSG91 send it
   * with each webhook; Meta asks for it once when the webhook is added (the "verify token").
   */
  generatesWebhookToken?: boolean
  fields: readonly ConnectorField[]
  docsUrl?: string
}

const DIGITS = { source: '^[0-9]{6,20}$', message: 'Digits only, as shown in Meta' }

export const CONNECTOR_PROVIDERS = [
  {
    key: 'razorpay',
    label: 'Razorpay',
    kind: 'payment',
    phase: 'mvp',
    hasModes: true,
    webhookPath: 'razorpay',
    webhookEvents: ['payment.captured', 'payment.failed', 'order.paid', 'refund.processed'],
    webhookAuth: 'signature',
    docsUrl: 'https://razorpay.com/docs/payments/dashboard/account-settings/api-keys/',
    fields: [
      {
        key: 'keyId',
        label: 'Key ID',
        required: true,
        placeholder: 'rzp_live_…',
        pattern: {
          source: '^rzp_(test|live)_[A-Za-z0-9]{8,}$',
          message: 'A Razorpay key ID starts with rzp_test_ or rzp_live_',
        },
      },
      { key: 'keySecret', label: 'Key secret', secret: true, required: true },
      {
        key: 'webhookSecret',
        label: 'Webhook secret',
        secret: true,
        required: true,
        help: 'The secret you typed when adding the webhook in Razorpay',
      },
    ],
  },
  {
    key: 'manual',
    label: 'Manual shipping',
    kind: 'shipping',
    phase: 'mvp',
    alwaysOn: true,
    fields: [],
  },
  {
    key: 'shiprocket',
    label: 'Shiprocket',
    kind: 'shipping',
    phase: 'mvp',
    // Shiprocket refuses webhook addresses containing "shiprocket", "sr" or "kr" (docs/09)
    webhookPath: 'courier',
    webhookAuth: 'token',
    generatesWebhookToken: true,
    docsUrl: 'https://apidocs.shiprocket.in/',
    fields: [
      {
        key: 'apiEmail',
        label: 'API user email',
        secret: true,
        required: true,
        help: 'Created in Shiprocket under Settings, API, with an email different from your login',
      },
      { key: 'apiPassword', label: 'API user password', secret: true, required: true },
      {
        key: 'pickupLocation',
        label: 'Pickup location name',
        required: true,
        placeholder: 'Primary',
        help: 'Exactly as named in Shiprocket under Settings, Pickup addresses',
      },
      {
        key: 'pickupPincode',
        label: 'Pickup pincode',
        required: true,
        pattern: { source: '^[1-9][0-9]{5}$', message: 'Enter a 6-digit pincode' },
      },
      {
        key: 'courierMode',
        label: 'Courier',
        options: [
          { value: 'auto', label: 'Chosen by Shiprocket (your courier priority)' },
          { value: 'choose', label: 'Staff choose when packing' },
        ],
      },
    ],
  },
  {
    key: 'meta-whatsapp',
    label: 'WhatsApp (Meta Cloud API)',
    kind: 'messaging',
    phase: 'mvp',
    webhookPath: 'whatsapp',
    webhookEvents: ['messages', 'message_template_status_update'],
    webhookAuth: 'signature',
    generatesWebhookToken: true,
    docsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
    fields: [
      { key: 'phoneNumberId', label: 'Phone number ID', required: true, pattern: DIGITS },
      { key: 'wabaId', label: 'Business account ID', required: true, pattern: DIGITS },
      {
        key: 'displayPhone',
        label: 'Sending number',
        placeholder: '+91 90000 00001',
        help: 'Shown to your team only',
      },
      {
        key: 'accessToken',
        label: 'Access token',
        secret: true,
        required: true,
        help: 'A permanent system user token from the Meta Business portfolio',
      },
      {
        key: 'appSecret',
        label: 'App secret',
        secret: true,
        required: true,
        help: 'Checks that webhooks really come from Meta',
      },
    ],
  },
  {
    key: 'msg91',
    label: 'SMS (MSG91 with DLT)',
    kind: 'messaging',
    phase: 'later',
    webhookPath: 'msg91',
    webhookAuth: 'token',
    generatesWebhookToken: true,
    fields: [
      { key: 'senderId', label: 'Sender ID', required: true },
      { key: 'dltEntityId', label: 'DLT entity ID', required: true },
      { key: 'authKey', label: 'Auth key', secret: true, required: true },
    ],
  },
] as const satisfies readonly ConnectorProvider[]

export type ConnectorProviderKey = (typeof CONNECTOR_PROVIDERS)[number]['key']
export type ConnectorKind = ConnectorProvider['kind']

export const CONNECTOR_PROVIDER_KEYS = CONNECTOR_PROVIDERS.map((provider) => provider.key)

export const isConnectorProviderKey = (value: string): value is ConnectorProviderKey =>
  (CONNECTOR_PROVIDER_KEYS as readonly string[]).includes(value)

export function getConnectorProvider(key: string): ConnectorProvider {
  const provider = CONNECTOR_PROVIDERS.find((item) => item.key === key)
  if (!provider) throw new Error(`Unknown connector "${key}"`)
  return provider
}

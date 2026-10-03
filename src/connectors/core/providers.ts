// Provider keys for connector-configs.provider and plans.allowedConnectors (docs/09).
// The connector implementations arrive with their sprints; this list is the shared vocabulary.

export const CONNECTOR_PROVIDERS = [
  { key: 'razorpay', label: 'Razorpay', kind: 'payment', phase: 'mvp' },
  { key: 'manual', label: 'Manual shipping', kind: 'shipping', phase: 'mvp' },
  { key: 'shiprocket', label: 'Shiprocket', kind: 'shipping', phase: 'mvp' },
  {
    key: 'meta-whatsapp',
    label: 'WhatsApp order updates (Meta Cloud API)',
    kind: 'messaging',
    phase: 'mvp',
  },
  { key: 'msg91', label: 'SMS order updates (MSG91 with DLT)', kind: 'messaging', phase: 'mvp' },
] as const

export type ConnectorProviderKey = (typeof CONNECTOR_PROVIDERS)[number]['key']
export type ConnectorKind = (typeof CONNECTOR_PROVIDERS)[number]['kind']

export const CONNECTOR_PROVIDER_KEYS = CONNECTOR_PROVIDERS.map((provider) => provider.key)

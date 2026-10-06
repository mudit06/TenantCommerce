import type { ConnectorProviderKey } from './providers'

// Shapes shared by every connector (docs/09 "Interfaces"). Each provider folder implements the
// parts its sprint needs; the interfaces grow with checkout, shipping and messaging.

export type ConnectorMode = 'test' | 'live'

/** What a connector call gets: the store, its mode and its decrypted keys (server only). */
export type ConnectorContext = {
  tenantId: string
  provider: ConnectorProviderKey
  mode: ConnectorMode
  public: Record<string, string>
  secret: Record<string, string>
  /** Tests replace the network */
  fetchImpl?: typeof fetch
}

export type TestResult = {
  ok: boolean
  /** One sentence for the owner, never containing a key */
  message: string
  /** Facts worth showing next to the connector (WhatsApp quality, messaging limit) */
  details?: Record<string, string | number | boolean | null>
}

export type ConnectorImplementation = {
  testCredentials: (ctx: ConnectorContext) => Promise<TestResult>
}

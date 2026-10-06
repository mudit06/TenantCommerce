// Public API of the connectors (docs/09). Modules call providers only through these.
export { ConnectorConfigs } from './collections/ConnectorConfigs'
export { connectorEndpoints } from './core/endpoints'
export {
  CONNECTOR_PROVIDERS,
  getConnectorProvider,
  type ConnectorField,
  type ConnectorProvider,
  type ConnectorProviderKey,
} from './core/providers'
export {
  connectorAvailability,
  connectorOverview,
  loadConnector,
  saveConnector,
  setConnectorAllowed,
  testConnector,
  webhookUrlFor,
  type ConnectorAvailability,
  type ConnectorSummary,
} from './core/service'
export type { ConnectorContext, ConnectorMode, TestResult } from './core/types'

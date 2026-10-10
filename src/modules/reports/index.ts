// Public API of the reports module (docs/01): a month's sales and the GST summary. The endpoints
// are imported by payload.config directly.
export {
  assertReportAccess,
  buildReport,
  hsnSummary,
  monthRange,
  soldOrders,
  type HsnRow,
  type Report,
} from './services/report'
export {
  ordersPlacedByStore,
  ordersThisMonth,
  platformSales,
  type PlatformSales,
} from './services/platform'

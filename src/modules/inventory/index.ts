// Public API of the inventory module (docs/01): stock reservations and movements.
export { StockMovements } from './collections/StockMovements'
export {
  releaseStock,
  reserveStock,
  restock,
  sellReservedStock,
  stockLinesOf,
  type StockLine,
} from './services/stock'

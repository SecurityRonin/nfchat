/**
 * MotherDuck Client Module
 *
 * Cloud-based DuckDB client using MotherDuck service.
 * Provides the same interface as duckdb.ts for seamless migration.
 */

// Connection management
export { initMotherDuck, getConnection, resetConnection } from './connection';

// Query execution and transforms
export { executeQuery } from './queries/executor';
export { convertBigInts } from './transform';

// Flow queries
export { getTimeRange, getFlows, getFlowCount } from './queries/flows';

// Aggregation queries
export {
  getAttackDistribution,
  getTopTalkers,
  getProtocolDistribution,
  getTimelineData,
  getNetworkGraph,
} from './queries/aggregations';

// Data loading
export { loadFileToMotherDuck, loadParquetData } from './loader';

// Types
export type { LoadDataOptions } from './types';

/**
 * MotherDuck Client Module
 *
 * Re-exports from modular structure for backwards compatibility.
 */

export {
  initMotherDuck,
  getConnection,
  resetConnection,
  executeQuery,
  getTimeRange,
  getFlows,
  getFlowCount,
  getAttackDistribution,
  getTopTalkers,
  getProtocolDistribution,
  getTimelineData,
  getNetworkGraph,
  loadFileToMotherDuck,
  loadParquetData,
} from './motherduck/index';

export type { LoadDataOptions } from './motherduck/types';

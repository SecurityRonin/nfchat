/**
 * Flow-related Queries
 *
 * Get paginated flows, counts, and time ranges.
 */

import { executeQuery } from './executor';
import type { TimeRange } from '../types';

/**
 * Get the time range of flow data.
 */
export async function getTimeRange(): Promise<TimeRange> {
  const result = await executeQuery<{ min_time: number; max_time: number }>(`
    SELECT
      MIN(FLOW_START_MILLISECONDS) as min_time,
      MAX(FLOW_END_MILLISECONDS) as max_time
    FROM flows
  `);

  return {
    min: result[0].min_time,
    max: result[0].max_time,
  };
}

/**
 * Get paginated flow records.
 */
export async function getFlows(
  whereClause: string = '1=1',
  limit: number = 1000,
  offset: number = 0
): Promise<Record<string, unknown>[]> {
  return executeQuery(`
    SELECT *
    FROM flows
    WHERE ${whereClause}
    ORDER BY FLOW_START_MILLISECONDS DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `);
}

/**
 * Get total flow count with optional filter.
 */
export async function getFlowCount(whereClause: string = '1=1'): Promise<number> {
  const result = await executeQuery<{ cnt: number }>(`
    SELECT COUNT(*) as cnt FROM flows WHERE ${whereClause}
  `);
  return result[0].cnt;
}

/**
 * MotherDuck Query Executor
 *
 * Base query execution with BigInt conversion.
 */

import { getConnection } from '../connection';
import { convertBigInts } from '../transform';

/**
 * Execute a SQL query and return results.
 */
export async function executeQuery<T = Record<string, unknown>>(
  sql: string
): Promise<T[]> {
  const conn = await getConnection();
  const result = await conn.evaluateQuery(sql);
  const rows = result.data.toRows() as T[];
  return convertBigInts(rows);
}

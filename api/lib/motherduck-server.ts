/**
 * Server-side MotherDuck Client Module
 *
 * Uses @duckdb/node-api for native Node.js MotherDuck connection.
 * This works in Vercel serverless functions (unlike WASM).
 */

import { DuckDBInstance, DuckDBConnection } from '@duckdb/node-api'

// Singleton instance and connection
let instance: DuckDBInstance | null = null
let connection: DuckDBConnection | null = null

/**
 * Get MotherDuck token from environment.
 */
function getToken(): string {
  const token = process.env.MOTHERDUCK_TOKEN
  if (!token) {
    throw new Error('MOTHERDUCK_TOKEN environment variable not set')
  }
  return token
}

/**
 * Initialize MotherDuck connection.
 */
export async function initMotherDuck(): Promise<DuckDBConnection> {
  if (connection) return connection

  const token = getToken()

  console.log('[MotherDuck] Creating server-side connection...')

  // Create instance with MotherDuck connection
  // Token MUST be embedded in connection string, not as separate config option
  const connectionString = `md:?motherduck_token=${token}`
  instance = await DuckDBInstance.create(connectionString)

  connection = await instance.connect()
  console.log('[MotherDuck] Server-side connection initialized')

  return connection
}

/**
 * Get the current connection, initializing if needed.
 */
export async function getConnection(): Promise<DuckDBConnection> {
  return initMotherDuck()
}

/**
 * Reset the connection.
 */
export function resetConnection(): void {
  connection = null
  instance = null
}

/**
 * Execute a SQL query and return results.
 */
export async function executeQuery<T = Record<string, unknown>>(
  sql: string
): Promise<T[]> {
  const conn = await getConnection()
  const result = await conn.runAndReadAll(sql)
  return result.getRowObjects() as T[]
}

/**
 * Get the time range of flow data.
 */
export async function getTimeRange(): Promise<{ min: number; max: number }> {
  const result = await executeQuery<{ min_time: number; max_time: number }>(`
    SELECT
      MIN(FLOW_START_MILLISECONDS) as min_time,
      MAX(FLOW_END_MILLISECONDS) as max_time
    FROM flows
  `)

  return {
    min: result[0].min_time,
    max: result[0].max_time,
  }
}

/**
 * Get attack type distribution.
 */
export async function getAttackDistribution(): Promise<
  { attack: string; count: number }[]
> {
  return executeQuery(`
    SELECT Attack as attack, COUNT(*) as count
    FROM flows
    GROUP BY Attack
    ORDER BY count DESC
  `)
}

/**
 * Get top IP talkers by flows or bytes.
 */
export async function getTopTalkers(
  direction: 'src' | 'dst',
  metric: 'bytes' | 'flows',
  limit: number = 10,
  whereClause: string = '1=1'
): Promise<{ ip: string; value: number }[]> {
  const ipCol = direction === 'src' ? 'IPV4_SRC_ADDR' : 'IPV4_DST_ADDR'
  const valueExpr =
    metric === 'bytes' ? 'SUM(IN_BYTES + OUT_BYTES)' : 'COUNT(*)'

  return executeQuery(`
    SELECT ${ipCol} as ip, ${valueExpr} as value
    FROM flows
    WHERE ${whereClause}
    GROUP BY ${ipCol}
    ORDER BY value DESC
    LIMIT ${limit}
  `)
}

/**
 * Get protocol distribution.
 */
export async function getProtocolDistribution(
  whereClause: string = '1=1'
): Promise<{ protocol: number; count: number }[]> {
  return executeQuery(`
    SELECT PROTOCOL as protocol, COUNT(*) as count
    FROM flows
    WHERE ${whereClause}
    GROUP BY PROTOCOL
    ORDER BY count DESC
  `)
}

/**
 * Get time-bucketed flow data for timeline visualization.
 */
export async function getTimelineData(
  bucketMinutes: number = 60,
  whereClause: string = '1=1'
): Promise<{ time: number; attack: string; count: number }[]> {
  const bucketMs = bucketMinutes * 60 * 1000

  return executeQuery(`
    SELECT
      (FLOW_START_MILLISECONDS / ${bucketMs}) * ${bucketMs} as time,
      Attack as attack,
      COUNT(*) as count
    FROM flows
    WHERE ${whereClause}
    GROUP BY time, attack
    ORDER BY time, attack
  `)
}

/**
 * Get network graph edges (source -> destination pairs).
 */
export async function getNetworkGraph(
  limit: number = 100,
  whereClause: string = '1=1'
): Promise<{ source: string; target: string; weight: number }[]> {
  return executeQuery(`
    SELECT
      IPV4_SRC_ADDR as source,
      IPV4_DST_ADDR as target,
      COUNT(*) as weight
    FROM flows
    WHERE ${whereClause}
    GROUP BY IPV4_SRC_ADDR, IPV4_DST_ADDR
    ORDER BY weight DESC
    LIMIT ${limit}
  `)
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
  `)
}

/**
 * Get total flow count with optional filter.
 */
export async function getFlowCount(
  whereClause: string = '1=1'
): Promise<number> {
  const result = await executeQuery<{ cnt: number }>(`
    SELECT COUNT(*) as cnt FROM flows WHERE ${whereClause}
  `)
  return Number(result[0].cnt)
}

/**
 * Load data from a URL into MotherDuck.
 */
export async function loadParquetData(url: string): Promise<number> {
  const conn = await getConnection()

  console.log(`[MotherDuck] Loading parquet from ${url}`)

  // Create table directly from URL
  await conn.run(`
    CREATE OR REPLACE TABLE flows AS
    SELECT * FROM read_parquet('${url}')
  `)

  console.log('[MotherDuck] Table created successfully')

  const count = await getFlowCount()
  console.log(`[MotherDuck] Loaded ${count.toLocaleString()} rows`)

  return count
}

/**
 * Check if flows table exists.
 */
export async function hasFlowsTable(): Promise<boolean> {
  try {
    await executeQuery('SELECT 1 FROM flows LIMIT 1')
    return true
  } catch {
    return false
  }
}

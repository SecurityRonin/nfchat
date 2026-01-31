/**
 * Vercel API Route: POST /api/motherduck/dashboard
 *
 * Get all dashboard data in a single call.
 * Note: DuckDB code is inlined because Vercel doesn't properly trace
 * imports from shared modules in the api/ directory.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'

// Set HOME before importing DuckDB - required for serverless environments
if (!process.env.HOME) {
  process.env.HOME = '/tmp'
}

import duckdb from 'duckdb-lambda-x86'

// Singleton database
let db: ReturnType<typeof duckdb.Database> | null = null

async function getConnection(): Promise<ReturnType<typeof duckdb.Database>> {
  if (db) return db

  const token = process.env.MOTHERDUCK_TOKEN
  if (!token) {
    throw new Error('MOTHERDUCK_TOKEN not set')
  }

  return new Promise((resolve, reject) => {
    const connectionString = `md:?motherduck_token=${token}`
    db = new duckdb.Database(connectionString, (err: Error | null) => {
      if (err) {
        db = null
        reject(err)
      } else {
        resolve(db!)
      }
    })
  })
}

async function executeQuery<T>(sql: string): Promise<T[]> {
  const database = await getConnection()
  return new Promise((resolve, reject) => {
    database.all(sql, (err: Error | null, rows: T[]) => {
      if (err) reject(err)
      else resolve(rows || [])
    })
  })
}

function convertBigInts<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'bigint') return Number(obj) as T
  if (Array.isArray(obj)) return obj.map(convertBigInts) as T
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = convertBigInts(value)
    }
    return result as T
  }
  return obj
}

async function getAttackDistribution(): Promise<{ attack: string; count: number }[]> {
  return executeQuery(`
    SELECT Attack as attack, COUNT(*) as count
    FROM flows
    GROUP BY Attack
    ORDER BY count DESC
  `)
}

async function getTopTalkers(
  direction: 'src' | 'dst',
  metric: 'bytes' | 'flows',
  limit: number = 10,
  whereClause: string = '1=1'
): Promise<{ ip: string; value: number }[]> {
  const ipCol = direction === 'src' ? 'IPV4_SRC_ADDR' : 'IPV4_DST_ADDR'
  const valueExpr = metric === 'bytes' ? 'SUM(IN_BYTES + OUT_BYTES)' : 'COUNT(*)'

  return executeQuery(`
    SELECT ${ipCol} as ip, ${valueExpr} as value
    FROM flows
    WHERE ${whereClause}
    GROUP BY ${ipCol}
    ORDER BY value DESC
    LIMIT ${limit}
  `)
}

async function getTimelineData(
  bucketMinutes: number = 60,
  whereClause: string = '1=1'
): Promise<{ time: number; attack: string; count: number }[]> {
  const bucketMs = bucketMinutes * 60 * 1000

  // Use FLOOR to ensure integer division for proper bucketing
  return executeQuery(`
    SELECT
      CAST(FLOOR(FLOW_START_MILLISECONDS / ${bucketMs}) AS BIGINT) * ${bucketMs} as time,
      Attack as attack,
      COUNT(*) as count
    FROM flows
    WHERE ${whereClause}
    GROUP BY time, attack
    ORDER BY time, attack
  `)
}

async function getFlows(
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

async function getFlowCount(whereClause: string = '1=1'): Promise<number> {
  const result = await executeQuery<{ cnt: number }>(`
    SELECT COUNT(*) as cnt FROM flows WHERE ${whereClause}
  `)
  return Number(result[0].cnt)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const {
      bucketMinutes = 60,
      whereClause = '1=1',
      limit = 1000,
      offset = 0,
    } = req.body || {}

    // Execute all queries in parallel
    const [timeline, attacks, topSrcIPs, topDstIPs, flows, totalCount] =
      await Promise.all([
        getTimelineData(bucketMinutes, whereClause),
        getAttackDistribution(),
        getTopTalkers('src', 'flows', 10, whereClause),
        getTopTalkers('dst', 'flows', 10, whereClause),
        getFlows(whereClause, limit, offset),
        getFlowCount(whereClause),
      ])

    const data = {
      timeline: convertBigInts(timeline),
      attacks: convertBigInts(attacks),
      topSrcIPs: convertBigInts(topSrcIPs),
      topDstIPs: convertBigInts(topDstIPs),
      flows: convertBigInts(flows),
      totalCount: Number(totalCount),
    }

    return res.status(200).json({ success: true, data })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('MotherDuck dashboard error:', errorMessage)
    return res.status(500).json({
      success: false,
      error: errorMessage,
    })
  }
}

/**
 * Vercel API Route: POST /api/motherduck/flows
 *
 * Lightweight endpoint that returns only flows + count (no aggregations).
 * Used for pagination and filter changes where aggregations aren't needed.
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { whereClause = '1=1', limit = 50, offset = 0, deduplicate = false } = req.body || {}

    // Build flow query - optionally deduplicate by 5-tuple
    const flowQuery = deduplicate
      ? `
        WITH aggregated AS (
          SELECT
            IPV4_SRC_ADDR, L4_SRC_PORT, IPV4_DST_ADDR, L4_DST_PORT, PROTOCOL,
            STRING_AGG(DISTINCT Attack, ', ' ORDER BY Attack) as Attack,
            MIN(FLOW_START_MILLISECONDS) as FLOW_START_MILLISECONDS,
            MAX(FLOW_END_MILLISECONDS) as FLOW_END_MILLISECONDS,
            SUM(FLOW_DURATION_MILLISECONDS) as FLOW_DURATION_MILLISECONDS,
            MAX(Label) as Label,
            STRING_AGG(DISTINCT MITRE_TACTIC, ', ' ORDER BY MITRE_TACTIC) as MITRE_TACTIC,
            STRING_AGG(DISTINCT MITRE_TECHNIQUE, ', ' ORDER BY MITRE_TECHNIQUE) FILTER (WHERE MITRE_TECHNIQUE != '') as MITRE_TECHNIQUE,
            MAX(CONN_STATE) as CONN_STATE,
            MAX(SERVICE) as SERVICE,
            MAX(COMMUNITY_ID) as COMMUNITY_ID,
            SUM(IN_BYTES) as IN_BYTES,
            SUM(OUT_BYTES) as OUT_BYTES,
            SUM(IN_PKTS) as IN_PKTS,
            SUM(OUT_PKTS) as OUT_PKTS,
            MAX(L7_PROTO) as L7_PROTO,
            MAX(TCP_FLAGS) as TCP_FLAGS,
            MAX(MIN_TTL) as MIN_TTL,
            MAX(MAX_TTL) as MAX_TTL
          FROM flows
          WHERE ${whereClause}
          GROUP BY IPV4_SRC_ADDR, L4_SRC_PORT, IPV4_DST_ADDR, L4_DST_PORT, PROTOCOL
        )
        SELECT * FROM aggregated
        ORDER BY FLOW_START_MILLISECONDS DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `
      : `
        SELECT *
        FROM flows
        WHERE ${whereClause}
        ORDER BY FLOW_START_MILLISECONDS DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `

    // Build count query - count unique flows when deduplicating
    const countQuery = deduplicate
      ? `SELECT COUNT(DISTINCT (IPV4_SRC_ADDR, L4_SRC_PORT, IPV4_DST_ADDR, L4_DST_PORT, PROTOCOL)) as cnt FROM flows WHERE ${whereClause}`
      : `SELECT COUNT(*) as cnt FROM flows WHERE ${whereClause}`

    const [flows, countResult] = await Promise.all([
      executeQuery<Record<string, unknown>>(flowQuery),
      executeQuery<{ cnt: number }>(countQuery),
    ])

    const data = {
      flows: convertBigInts(flows),
      totalCount: Number(countResult[0].cnt),
    }

    return res.status(200).json({ success: true, data })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('MotherDuck flows error:', errorMessage)
    return res.status(500).json({
      success: false,
      error: errorMessage,
    })
  }
}

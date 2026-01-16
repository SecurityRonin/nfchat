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

// @ts-expect-error - duckdb-lambda-x86 has same API as duckdb but no types
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
    const { whereClause = '1=1', limit = 50, offset = 0 } = req.body || {}

    // Only 2 queries: flows + count (no aggregations!)
    const [flows, countResult] = await Promise.all([
      executeQuery<Record<string, unknown>>(`
        SELECT *
        FROM flows
        WHERE ${whereClause}
        ORDER BY FLOW_START_MILLISECONDS DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `),
      executeQuery<{ cnt: number }>(`
        SELECT COUNT(*) as cnt FROM flows WHERE ${whereClause}
      `),
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

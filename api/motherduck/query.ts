/**
 * Vercel API Route: POST /api/motherduck/query
 *
 * Execute a SQL query on MotherDuck.
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { sql } = req.body || {}

    // Validate SQL
    if (!sql || typeof sql !== 'string' || sql.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Missing SQL query' })
    }

    console.log('[API] Executing query:', sql.substring(0, 100))
    const data = await executeQuery(sql)

    return res.status(200).json({
      success: true,
      data: convertBigInts(data),
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('MotherDuck query error:', errorMessage)
    return res.status(500).json({
      success: false,
      error: errorMessage,
    })
  }
}

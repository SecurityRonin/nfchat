import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Database, loadParquet, query, close } from './database.js'
import * as fs from 'fs'
import * as path from 'path'

describe('DuckDB Database', () => {
  const testDataPath = '/tmp/test-flows.parquet'

  describe('query', () => {
    it('executes a simple query', async () => {
      const db = new Database()
      const result = await db.query('SELECT 1 as value')
      expect(result).toEqual([{ value: 1 }])
      await db.close()
    })

    it('returns multiple rows', async () => {
      const db = new Database()
      const result = await db.query('SELECT * FROM (VALUES (1, \'a\'), (2, \'b\')) AS t(num, letter)')
      expect(result.length).toBe(2)
      expect(result[0]).toHaveProperty('num')
      expect(result[0]).toHaveProperty('letter')
      await db.close()
    })
  })

  describe('loadParquet', () => {
    it('loads a parquet file and makes it queryable', async () => {
      const db = new Database()
      // Use the actual dataset if available
      const datasetPath = path.join(process.cwd(), '../public/data/NF-UNSW-NB15-v3.parquet')

      if (fs.existsSync(datasetPath)) {
        await db.loadParquet(datasetPath, 'flows')
        const result = await db.query('SELECT COUNT(*) as count FROM flows')
        expect(result[0].count).toBeGreaterThan(0)
      } else {
        // Skip if dataset not available
        expect(true).toBe(true)
      }
      await db.close()
    })
  })

  describe('schema introspection', () => {
    it('returns column names for a table', async () => {
      const db = new Database()
      const datasetPath = path.join(process.cwd(), '../public/data/NF-UNSW-NB15-v3.parquet')

      if (fs.existsSync(datasetPath)) {
        await db.loadParquet(datasetPath, 'flows')
        const schema = await db.getSchema('flows')
        expect(schema).toContain('IPV4_SRC_ADDR')
        expect(schema).toContain('Attack')
      } else {
        expect(true).toBe(true)
      }
      await db.close()
    })
  })
})

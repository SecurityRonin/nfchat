import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Database } from './database.js'
import {
  getTopTalkers,
  getAttackBreakdown,
  getProtocolDistribution,
  investigateIP,
  getTimeRange,
} from './tools.js'
import * as fs from 'fs'
import * as path from 'path'

describe('NetFlow Analysis Tools', () => {
  let db: Database
  const datasetPath = path.join(process.cwd(), '../public/data/NF-UNSW-NB15-v3.parquet')
  const hasDataset = fs.existsSync(datasetPath)

  beforeAll(async () => {
    db = new Database()
    if (hasDataset) {
      await db.loadParquet(datasetPath, 'flows')
    }
  })

  afterAll(async () => {
    await db.close()
  })

  describe('getTopTalkers', () => {
    it('returns top source IPs by flow count', async () => {
      if (!hasDataset) return

      const result = await getTopTalkers(db, { limit: 5, direction: 'src' })
      expect(result.length).toBeLessThanOrEqual(5)
      expect(result[0]).toHaveProperty('ip')
      expect(result[0]).toHaveProperty('count')
      expect(result[0].count).toBeGreaterThan(result[result.length - 1].count)
    })

    it('returns top destination IPs', async () => {
      if (!hasDataset) return

      const result = await getTopTalkers(db, { limit: 5, direction: 'dst' })
      expect(result.length).toBeLessThanOrEqual(5)
      expect(result[0]).toHaveProperty('ip')
    })
  })

  describe('getAttackBreakdown', () => {
    it('returns count per attack type', async () => {
      if (!hasDataset) return

      const result = await getAttackBreakdown(db)
      expect(result.length).toBeGreaterThan(0)
      expect(result[0]).toHaveProperty('attack')
      expect(result[0]).toHaveProperty('count')
      // Should include Benign
      const benign = result.find((r) => r.attack === 'Benign')
      expect(benign).toBeDefined()
    })
  })

  describe('getProtocolDistribution', () => {
    it('returns count per protocol', async () => {
      if (!hasDataset) return

      const result = await getProtocolDistribution(db)
      expect(result.length).toBeGreaterThan(0)
      expect(result[0]).toHaveProperty('protocol')
      expect(result[0]).toHaveProperty('count')
    })
  })

  describe('investigateIP', () => {
    it('returns flows for a specific IP', async () => {
      if (!hasDataset) return

      // First get a known IP from the dataset
      const topTalkers = await getTopTalkers(db, { limit: 1, direction: 'src' })
      const ip = topTalkers[0].ip

      const result = await investigateIP(db, ip, { limit: 10 })
      expect(result.flows.length).toBeLessThanOrEqual(10)
      expect(result.summary).toHaveProperty('totalFlows')
      expect(result.summary).toHaveProperty('attackTypes')
    })
  })

  describe('getTimeRange', () => {
    it('returns min and max timestamps', async () => {
      if (!hasDataset) return

      const result = await getTimeRange(db)
      expect(result).toHaveProperty('start')
      expect(result).toHaveProperty('end')
      expect(result.start).toBeLessThan(result.end)
    })
  })
})

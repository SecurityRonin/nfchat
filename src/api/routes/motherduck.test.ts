/**
 * MotherDuck API Route Tests (TDD)
 *
 * POST /api/motherduck/query - Execute SQL query
 * POST /api/motherduck/load - Load parquet from URL
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock result for runAndReadAll
const mockGetRowObjects = vi.fn().mockReturnValue([{ cnt: 100, count: 100 }])
const mockRunAndReadAll = vi.fn().mockResolvedValue({
  getRowObjects: mockGetRowObjects,
})
const mockRun = vi.fn().mockResolvedValue(undefined)
const mockConnect = vi.fn().mockResolvedValue({
  runAndReadAll: mockRunAndReadAll,
  run: mockRun,
})
const mockCreate = vi.fn().mockResolvedValue({
  connect: mockConnect,
})

// Mock the DuckDB Node API
vi.mock('@duckdb/node-api', () => ({
  DuckDBInstance: {
    create: mockCreate,
  },
}))

describe('MotherDuck API Routes', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // Reset module to clear cached connection
    vi.resetModules()
    // Set up mock token in env
    process.env.MOTHERDUCK_TOKEN = 'test-token'
    // Reset the mocks to default behavior
    mockGetRowObjects.mockReturnValue([{ cnt: 100, count: 100 }])
    mockRunAndReadAll.mockResolvedValue({
      getRowObjects: mockGetRowObjects,
    })
    mockRun.mockResolvedValue(undefined)
    mockConnect.mockResolvedValue({
      runAndReadAll: mockRunAndReadAll,
      run: mockRun,
    })
    mockCreate.mockResolvedValue({
      connect: mockConnect,
    })
  })

  describe('handleQuery', () => {
    it('executes SQL query and returns results', async () => {
      const { handleQuery } = await import('./motherduck')

      const result = await handleQuery({
        sql: 'SELECT COUNT(*) as count FROM flows',
      })

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data![0]).toHaveProperty('count', 100)
    })

    it('rejects empty SQL query', async () => {
      const { handleQuery } = await import('./motherduck')

      const result = await handleQuery({
        sql: '',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('SQL')
    })

    it('rejects when no token is configured', async () => {
      delete process.env.MOTHERDUCK_TOKEN

      // Need to re-import to pick up env change
      vi.resetModules()
      const { handleQuery } = await import('./motherduck')

      const result = await handleQuery({
        sql: 'SELECT 1',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('token')
    })

    it('handles query execution errors', async () => {
      // Make the mock reject for this test
      mockRunAndReadAll.mockRejectedValueOnce(new Error('Query failed'))

      const { handleQuery } = await import('./motherduck')

      const result = await handleQuery({
        sql: 'SELECT * FROM nonexistent',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Query failed')
    })
  })

  describe('handleLoadFromUrl', () => {
    it('loads parquet from URL and returns row count', async () => {
      const { handleLoadFromUrl } = await import('./motherduck')

      const result = await handleLoadFromUrl({
        url: 'https://example.com/data.parquet',
        tableName: 'flows',
      })

      expect(result.success).toBe(true)
      expect(result.rowCount).toBeDefined()
      expect(typeof result.rowCount).toBe('number')
    })

    it('rejects empty URL', async () => {
      const { handleLoadFromUrl } = await import('./motherduck')

      const result = await handleLoadFromUrl({
        url: '',
        tableName: 'flows',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('URL')
    })

    it('rejects invalid URL format', async () => {
      const { handleLoadFromUrl } = await import('./motherduck')

      const result = await handleLoadFromUrl({
        url: 'not-a-url',
        tableName: 'flows',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('URL')
    })

    it('rejects non-https URLs', async () => {
      const { handleLoadFromUrl } = await import('./motherduck')

      const result = await handleLoadFromUrl({
        url: 'http://example.com/data.parquet',
        tableName: 'flows',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('HTTPS')
    })

    it('uses default table name when not provided', async () => {
      const { handleLoadFromUrl } = await import('./motherduck')

      const result = await handleLoadFromUrl({
        url: 'https://example.com/data.parquet',
      })

      expect(result.success).toBe(true)
    })
  })

  describe('handleGetDashboardData', () => {
    it('returns all dashboard data in one call', async () => {
      const { handleGetDashboardData } = await import('./motherduck')

      const result = await handleGetDashboardData({
        bucketMinutes: 60,
      })

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data).toHaveProperty('timeline')
      expect(result.data).toHaveProperty('attacks')
      expect(result.data).toHaveProperty('topSrcIPs')
      expect(result.data).toHaveProperty('topDstIPs')
      expect(result.data).toHaveProperty('flows')
      expect(result.data).toHaveProperty('totalCount')
    })

    it('applies where clause filter', async () => {
      const { handleGetDashboardData } = await import('./motherduck')

      const result = await handleGetDashboardData({
        bucketMinutes: 60,
        whereClause: "Attack = 'Exploits'",
      })

      expect(result.success).toBe(true)
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock MDConnection before importing connection module
const mockEvaluateQuery = vi.fn().mockResolvedValue({ data: { toRows: () => [] } })
const mockIsInitialized = vi.fn()

vi.mock('@motherduck/wasm-client', () => ({
  MDConnection: {
    create: vi.fn(() => ({
      evaluateQuery: mockEvaluateQuery,
      isInitialized: mockIsInitialized,
    })),
  },
}))

vi.mock('../../motherduck-auth', () => ({
  getMotherDuckToken: () => 'test-token',
}))

// Import AFTER mocks are set up
import { initMotherDuck, resetConnection } from '../connection'

describe('initMotherDuck', () => {
  beforeEach(() => {
    resetConnection()
    mockEvaluateQuery.mockClear()
    mockIsInitialized.mockClear()
    mockIsInitialized.mockResolvedValue(undefined)
  })

  it('runs USE my_db during initialization', async () => {
    await initMotherDuck()
    expect(mockEvaluateQuery).toHaveBeenCalledWith('USE my_db')
  })

  it('concurrent callers both wait for USE my_db to complete', async () => {
    // Make isInitialized slow so we can test concurrency
    let resolveInit: () => void
    mockIsInitialized.mockReturnValue(
      new Promise<void>((resolve) => { resolveInit = resolve })
    )

    // Start two concurrent calls
    const p1 = initMotherDuck()
    const p2 = initMotherDuck()

    // Neither should have resolved yet (init is pending)
    let p1Resolved = false
    let p2Resolved = false
    p1.then(() => { p1Resolved = true })
    p2.then(() => { p2Resolved = true })

    // Tick the event loop
    await new Promise((r) => setTimeout(r, 10))
    expect(p1Resolved).toBe(false)
    expect(p2Resolved).toBe(false)

    // Complete initialization
    resolveInit!()

    // Both should resolve now
    await p1
    await p2

    // USE my_db should only be called once (one connection)
    expect(mockEvaluateQuery).toHaveBeenCalledTimes(1)
    expect(mockEvaluateQuery).toHaveBeenCalledWith('USE my_db')
  })

  it('retries after a failed initialization', async () => {
    mockIsInitialized.mockRejectedValueOnce(new Error('network error'))

    await expect(initMotherDuck()).rejects.toThrow('network error')

    // Second call should retry (not cache the failure)
    mockIsInitialized.mockResolvedValue(undefined)
    const conn = await initMotherDuck()
    expect(conn).toBeDefined()
  })
})

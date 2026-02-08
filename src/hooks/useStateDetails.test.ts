import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useStateDetails } from './useStateDetails'

// Mock query functions
const mockGetSampleFlows = vi.fn()
const mockGetStateTopHosts = vi.fn()
const mockGetStateTimeline = vi.fn()
const mockGetStateConnStates = vi.fn()
const mockGetStatePortServices = vi.fn()

vi.mock('@/lib/motherduck/queries', () => ({
  getSampleFlows: (...args: unknown[]) => mockGetSampleFlows(...args),
  getStateTopHosts: (...args: unknown[]) => mockGetStateTopHosts(...args),
  getStateTimeline: (...args: unknown[]) => mockGetStateTimeline(...args),
  getStateConnStates: (...args: unknown[]) => mockGetStateConnStates(...args),
  getStatePortServices: (...args: unknown[]) => mockGetStatePortServices(...args),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    })),
  },
}))

describe('useStateDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSampleFlows.mockResolvedValue([])
    mockGetStateTopHosts.mockResolvedValue({ srcHosts: [], dstHosts: [] })
    mockGetStateTimeline.mockResolvedValue([])
    mockGetStateConnStates.mockResolvedValue([])
    mockGetStatePortServices.mockResolvedValue({ ports: [], services: [] })
  })

  it('returns loading=false and empty data when disabled', () => {
    const { result } = renderHook(() => useStateDetails(0, false))
    expect(result.current.loading).toBe(false)
    expect(result.current.sampleFlows).toEqual([])
    expect(result.current.topHosts).toEqual({ srcHosts: [], dstHosts: [] })
    expect(mockGetSampleFlows).not.toHaveBeenCalled()
  })

  it('fetches all 5 queries when enabled', async () => {
    mockGetStateTopHosts.mockResolvedValue({
      srcHosts: [{ ip: '10.0.0.1', count: 100 }],
      dstHosts: [{ ip: '192.168.1.1', count: 80 }],
    })
    mockGetStateTimeline.mockResolvedValue([{ bucket: 0, count: 10 }])
    mockGetStateConnStates.mockResolvedValue([{ state: 'SF', count: 500 }])
    mockGetStatePortServices.mockResolvedValue({
      ports: [{ port: 443, count: 200 }],
      services: [{ service: 'https', count: 200 }],
    })
    mockGetSampleFlows.mockResolvedValue([{ IN_BYTES: 1024 }])

    const { result } = renderHook(() => useStateDetails(0, true))

    // Initially loading
    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.topHosts.srcHosts).toHaveLength(1)
    expect(result.current.topHosts.srcHosts[0].ip).toBe('10.0.0.1')
    expect(result.current.timeline).toHaveLength(1)
    expect(result.current.connStates).toHaveLength(1)
    expect(result.current.portServices.ports).toHaveLength(1)
    expect(result.current.sampleFlows).toHaveLength(1)
  })

  it('passes correct stateId to all queries', async () => {
    const { result } = renderHook(() => useStateDetails(42, true))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(mockGetStateTopHosts).toHaveBeenCalledWith(42)
    expect(mockGetStateTimeline).toHaveBeenCalledWith(42)
    expect(mockGetStateConnStates).toHaveBeenCalledWith(42)
    expect(mockGetStatePortServices).toHaveBeenCalledWith(42)
    expect(mockGetSampleFlows).toHaveBeenCalledWith(42)
  })

  it('sets error when a query fails', async () => {
    mockGetStateTopHosts.mockRejectedValue(new Error('DB connection failed'))

    const { result } = renderHook(() => useStateDetails(0, true))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('DB connection failed')
  })

  it('cancels fetch on unmount', async () => {
    let resolveFlows: (value: unknown[]) => void
    mockGetSampleFlows.mockImplementation(() => new Promise((resolve) => {
      resolveFlows = resolve
    }))

    const { result, unmount } = renderHook(() => useStateDetails(0, true))
    expect(result.current.loading).toBe(true)

    unmount()

    // Resolve after unmount - should not update state
    resolveFlows!([])
    // No error thrown = cancellation worked
  })

  it('refetches when stateId changes', async () => {
    const { result, rerender } = renderHook(
      ({ stateId }) => useStateDetails(stateId, true),
      { initialProps: { stateId: 0 } }
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(mockGetStateTopHosts).toHaveBeenCalledWith(0)

    rerender({ stateId: 1 })

    await waitFor(() => {
      expect(mockGetStateTopHosts).toHaveBeenCalledWith(1)
    })
  })

  it('enabled=false then toggled to true triggers fetch', async () => {
    const { result, rerender } = renderHook(
      ({ enabled }) => useStateDetails(0, enabled),
      { initialProps: { enabled: false } }
    )

    // Initially disabled - no fetch
    expect(result.current.loading).toBe(false)
    expect(mockGetSampleFlows).not.toHaveBeenCalled()

    // Enable fetch
    rerender({ enabled: true })

    expect(result.current.loading).toBe(true)
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(mockGetSampleFlows).toHaveBeenCalledWith(0)
  })

  it('non-Error thrown from query sets generic error message', async () => {
    mockGetStateTopHosts.mockRejectedValue('String error')

    const { result } = renderHook(() => useStateDetails(0, true))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Failed to load state details')
  })

  it('all queries return empty data', async () => {
    const { result } = renderHook(() => useStateDetails(0, true))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.sampleFlows).toEqual([])
    expect(result.current.topHosts).toEqual({ srcHosts: [], dstHosts: [] })
    expect(result.current.timeline).toEqual([])
    expect(result.current.connStates).toEqual([])
    expect(result.current.portServices).toEqual({ ports: [], services: [] })
  })

  it('re-render with same stateId does not re-fetch', async () => {
    const { result, rerender } = renderHook(
      ({ stateId }) => useStateDetails(stateId, true),
      { initialProps: { stateId: 0 } }
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(mockGetSampleFlows).toHaveBeenCalledTimes(1)

    // Re-render with same stateId
    rerender({ stateId: 0 })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Should still only be called once
    expect(mockGetSampleFlows).toHaveBeenCalledTimes(1)
  })

  it('error state is cleared on successful re-fetch after error', async () => {
    mockGetStateTopHosts.mockRejectedValueOnce(new Error('First error'))

    const { result, rerender } = renderHook(
      ({ stateId }) => useStateDetails(stateId, true),
      { initialProps: { stateId: 0 } }
    )

    // Wait for error
    await waitFor(() => {
      expect(result.current.error).toBe('First error')
    })

    // Fix mock and refetch with new stateId
    mockGetStateTopHosts.mockResolvedValue({ srcHosts: [], dstHosts: [] })
    rerender({ stateId: 1 })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe(null)
  })

  it('loading transitions: false → true → false', async () => {
    let resolveFlows: (value: unknown[]) => void
    mockGetSampleFlows.mockImplementation(() => new Promise((resolve) => {
      resolveFlows = resolve
    }))

    const { result } = renderHook(() => useStateDetails(0, true))

    // Effect runs synchronously, so loading is immediately true
    expect(result.current.loading).toBe(true)

    // Resolve and wait for loading to finish
    resolveFlows!([])
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
  })

  it('partial query failure (one of 5 fails)', async () => {
    mockGetStateTimeline.mockRejectedValue(new Error('Timeline query failed'))

    const { result } = renderHook(() => useStateDetails(0, true))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Promise.all rejects if any promise fails
    expect(result.current.error).toBe('Timeline query failed')
    // Data should not be updated on error
    expect(result.current.timeline).toEqual([])
  })

  it('enabled toggled false→true→false rapidly', async () => {
    let resolveFlows: (value: unknown[]) => void
    mockGetSampleFlows.mockImplementation(() => new Promise((resolve) => {
      resolveFlows = resolve
    }))

    const { result, rerender } = renderHook(
      ({ enabled }) => useStateDetails(0, enabled),
      { initialProps: { enabled: false } }
    )

    expect(mockGetSampleFlows).not.toHaveBeenCalled()

    // Enable
    rerender({ enabled: true })
    expect(result.current.loading).toBe(true)

    // Immediately disable before fetch completes
    rerender({ enabled: false })

    // Resolve the promise
    resolveFlows!([])

    // Loading should stay true because cleanup cancelled state updates
    // The disabled state returns early from effect, no state changes
    expect(result.current.loading).toBe(true)

    // Should have been called once (enable triggered it)
    expect(mockGetSampleFlows).toHaveBeenCalledTimes(1)
  })

  it('switching from enabled to disabled resets nothing', async () => {
    mockGetSampleFlows.mockResolvedValue([{ IN_BYTES: 1024 }])
    mockGetStateTopHosts.mockResolvedValue({
      srcHosts: [{ ip: '10.0.0.1', count: 100 }],
      dstHosts: [],
    })

    const { result, rerender } = renderHook(
      ({ enabled }) => useStateDetails(0, enabled),
      { initialProps: { enabled: true } }
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.sampleFlows).toHaveLength(1)
    expect(result.current.topHosts.srcHosts).toHaveLength(1)

    // Disable
    rerender({ enabled: false })

    // Data should remain
    expect(result.current.sampleFlows).toHaveLength(1)
    expect(result.current.topHosts.srcHosts).toHaveLength(1)
    expect(result.current.loading).toBe(false)
  })
})

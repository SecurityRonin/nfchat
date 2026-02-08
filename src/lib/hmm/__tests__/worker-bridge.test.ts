import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { trainInWorker } from '../worker-bridge'

// Captured mock worker instance
let capturedWorker: MockWorkerInstance | null = null

class MockWorkerInstance {
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror: ((e: ErrorEvent) => void) | null = null
  postMessage = vi.fn()
  terminate = vi.fn()

  constructor() {
    capturedWorker = this
  }
}

describe('trainInWorker', () => {
  let originalWorker: typeof globalThis.Worker

  beforeEach(() => {
    originalWorker = globalThis.Worker
    capturedWorker = null
  })

  afterEach(() => {
    globalThis.Worker = originalWorker
    vi.restoreAllMocks()
  })

  it('sends train message with matrix and requestedStates', async () => {
    // @ts-expect-error - mock Worker class
    globalThis.Worker = MockWorkerInstance

    const matrix = [[1, 2], [3, 4]]
    const promise = trainInWorker(matrix, 5)

    const worker = capturedWorker!
    expect(worker.postMessage).toHaveBeenCalledWith({
      type: 'train',
      matrix,
      requestedStates: 5,
    })

    worker.onmessage!({
      data: {
        type: 'result',
        states: [0, 1],
        nStates: 2,
        converged: true,
        iterations: 10,
        logLikelihood: -100,
      },
    } as MessageEvent)

    const result = await promise
    expect(result).toEqual({
      states: [0, 1],
      nStates: 2,
      converged: true,
      iterations: 10,
      logLikelihood: -100,
    })
  })

  it('terminates worker after result', async () => {
    // @ts-expect-error - mock Worker class
    globalThis.Worker = MockWorkerInstance

    const promise = trainInWorker([[1]], 2)
    const worker = capturedWorker!

    worker.onmessage!({
      data: {
        type: 'result',
        states: [0],
        nStates: 1,
        converged: true,
        iterations: 5,
        logLikelihood: -50,
      },
    } as MessageEvent)

    await promise
    expect(worker.terminate).toHaveBeenCalled()
  })

  it('calls onProgress for progress messages', async () => {
    // @ts-expect-error - mock Worker class
    globalThis.Worker = MockWorkerInstance

    const onProgress = vi.fn()
    const promise = trainInWorker([[1, 2]], 3, onProgress)
    const worker = capturedWorker!

    // Send progress messages
    worker.onmessage!({
      data: { type: 'progress', percent: 20, phase: 'scaling' },
    } as MessageEvent)

    worker.onmessage!({
      data: { type: 'progress', percent: 60, phase: 'training' },
    } as MessageEvent)

    expect(onProgress).toHaveBeenCalledTimes(2)
    expect(onProgress).toHaveBeenCalledWith(20, 'scaling')
    expect(onProgress).toHaveBeenCalledWith(60, 'training')

    // Send result to resolve
    worker.onmessage!({
      data: {
        type: 'result',
        states: [0],
        nStates: 1,
        converged: true,
        iterations: 5,
        logLikelihood: -50,
      },
    } as MessageEvent)

    await promise
  })

  it('rejects on worker error message', async () => {
    // @ts-expect-error - mock Worker class
    globalThis.Worker = MockWorkerInstance

    const promise = trainInWorker([[1]], 2)
    const worker = capturedWorker!

    worker.onmessage!({
      data: { type: 'error', message: 'Training diverged' },
    } as MessageEvent)

    await expect(promise).rejects.toThrow('Training diverged')
    expect(worker.terminate).toHaveBeenCalled()
  })

  it('rejects on worker onerror', async () => {
    // @ts-expect-error - mock Worker class
    globalThis.Worker = MockWorkerInstance

    const promise = trainInWorker([[1]], 2)
    const worker = capturedWorker!

    worker.onerror!({
      message: 'Script error',
    } as ErrorEvent)

    await expect(promise).rejects.toThrow('Script error')
    expect(worker.terminate).toHaveBeenCalled()
  })

  it('falls back to synchronous execution when Worker is undefined', async () => {
    // @ts-expect-error - simulate no Worker
    globalThis.Worker = undefined

    // Create simple 2-cluster data
    const matrix: number[][] = []
    for (let i = 0; i < 30; i++) {
      matrix.push([i < 15 ? 0 : 5, i < 15 ? 0 : 5])
    }

    const result = await trainInWorker(matrix, 2)
    expect(result.nStates).toBe(2)
    expect(result.states).toHaveLength(30)
    expect(typeof result.converged).toBe('boolean')
    expect(typeof result.iterations).toBe('number')
    expect(typeof result.logLikelihood).toBe('number')
  })

  it('falls back to synchronous with auto state selection (requestedStates=0)', async () => {
    // @ts-expect-error - simulate no Worker
    globalThis.Worker = undefined

    // Create data with a few clear clusters
    const matrix: number[][] = []
    for (let i = 0; i < 60; i++) {
      const cluster = i % 3
      matrix.push([cluster * 10, cluster * 10])
    }

    const result = await trainInWorker(matrix, 0)
    expect(result.nStates).toBeGreaterThanOrEqual(3)
    expect(result.states).toHaveLength(60)
  })

  it('fallback calls onProgress', async () => {
    // @ts-expect-error - simulate no Worker
    globalThis.Worker = undefined

    const onProgress = vi.fn()
    const matrix: number[][] = []
    for (let i = 0; i < 20; i++) {
      matrix.push([i < 10 ? 0 : 5, i < 10 ? 0 : 5])
    }

    await trainInWorker(matrix, 2, onProgress)
    expect(onProgress).toHaveBeenCalled()
  })
})

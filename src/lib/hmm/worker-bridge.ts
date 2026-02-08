/**
 * Bridge API for the HMM Web Worker.
 *
 * Wraps Worker postMessage/onmessage into a Promise-based API.
 * Falls back to synchronous execution when Worker is unavailable (e.g. SSR or tests).
 */

import { GaussianHMM } from './gaussian-hmm'
import { StandardScaler } from './features'
import type { WorkerOutMessage } from './hmm-worker'

export interface TrainResult {
  states: number[]
  nStates: number
  converged: boolean
  iterations: number
  logLikelihood: number
}

function trainSynchronously(
  matrix: number[][],
  requestedStates: number,
  onProgress?: (percent: number, phase: string) => void,
): TrainResult {
  onProgress?.(10, 'scaling')
  const scaler = new StandardScaler()
  const scaled = scaler.fitTransform(matrix)
  const nFeatures = scaled[0].length

  onProgress?.(20, 'scaling')

  let nStates: number
  if (requestedStates > 0) {
    nStates = requestedStates
  } else {
    onProgress?.(25, 'bic-selection')
    let bestBic = Infinity
    nStates = 4
    for (let k = 4; k <= 10; k++) {
      const candidate = new GaussianHMM(k, nFeatures, { maxIter: 20, seed: 42 })
      candidate.fit([scaled])
      const bic = candidate.bic([scaled])
      if (bic < bestBic) {
        bestBic = bic
        nStates = k
      }
      const bicProgress = 25 + Math.round(((k - 3) / 7) * 15)
      onProgress?.(bicProgress, 'bic-selection')
    }
  }

  onProgress?.(40, 'training')

  const hmm = new GaussianHMM(nStates, nFeatures, { maxIter: 100, seed: 42 })
  const fitResult = hmm.fit([scaled], {
    onProgress: (iter, maxIter) => {
      const percent = 40 + Math.round((iter / maxIter) * 40)
      onProgress?.(percent, 'training')
    },
  })

  onProgress?.(80, 'predicting')

  const states = hmm.predict(scaled)

  return {
    states,
    nStates,
    converged: fitResult.converged,
    iterations: fitResult.iterations,
    logLikelihood: fitResult.logLikelihood,
  }
}

/**
 * Train HMM in a Web Worker (or synchronously if Worker is unavailable).
 *
 * @param matrix - Feature matrix (rows = observations, cols = features)
 * @param requestedStates - Number of states to use (0 = auto-select via BIC)
 * @param onProgress - Optional progress callback (percent, phase)
 * @returns Promise with training result
 */
export function trainInWorker(
  matrix: number[][],
  requestedStates: number,
  onProgress?: (percent: number, phase: string) => void,
): Promise<TrainResult> {
  // Fallback: if Worker is not available, run synchronously
  if (typeof Worker === 'undefined') {
    return Promise.resolve(trainSynchronously(matrix, requestedStates, onProgress))
  }

  return new Promise<TrainResult>((resolve, reject) => {
    const worker = new Worker(
      new URL('./hmm-worker.ts', import.meta.url),
      { type: 'module' },
    )

    worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
      const msg = e.data
      switch (msg.type) {
        case 'progress':
          onProgress?.(msg.percent, msg.phase)
          break
        case 'result':
          worker.terminate()
          resolve({
            states: msg.states,
            nStates: msg.nStates,
            converged: msg.converged,
            iterations: msg.iterations,
            logLikelihood: msg.logLikelihood,
          })
          break
        case 'error':
          worker.terminate()
          reject(new Error(msg.message))
          break
      }
    }

    worker.onerror = (e: ErrorEvent) => {
      worker.terminate()
      reject(new Error(e.message))
    }

    worker.postMessage({
      type: 'train',
      matrix,
      requestedStates,
    })
  })
}

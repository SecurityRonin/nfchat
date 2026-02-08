/**
 * Web Worker for HMM training.
 *
 * Receives a feature matrix and requested state count,
 * performs scaling + BIC auto-selection + training + prediction,
 * and posts back progress updates and the final result.
 */

import { GaussianHMM } from './gaussian-hmm'
import { StandardScaler } from './features'

export interface TrainMessage {
  type: 'train'
  matrix: number[][]
  requestedStates: number
}

export interface ProgressMessage {
  type: 'progress'
  percent: number
  phase: string
}

export interface ResultMessage {
  type: 'result'
  states: number[]
  nStates: number
  converged: boolean
  iterations: number
  logLikelihood: number
}

export interface ErrorMessage {
  type: 'error'
  message: string
}

export type WorkerOutMessage = ProgressMessage | ResultMessage | ErrorMessage

function postProgress(percent: number, phase: string) {
  self.postMessage({ type: 'progress', percent, phase } satisfies ProgressMessage)
}

self.onmessage = (e: MessageEvent<TrainMessage>) => {
  const { matrix, requestedStates } = e.data

  try {
    // Scale features
    postProgress(10, 'scaling')
    const scaler = new StandardScaler()
    const scaled = scaler.fitTransform(matrix)
    const nFeatures = scaled[0].length

    postProgress(20, 'scaling')

    // Determine number of states
    let nStates: number
    if (requestedStates > 0) {
      nStates = requestedStates
    } else {
      // Auto-select via BIC over range 4-10
      postProgress(25, 'bic-selection')
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
        postProgress(bicProgress, 'bic-selection')
      }
    }

    postProgress(40, 'training')

    // Train final model
    const hmm = new GaussianHMM(nStates, nFeatures, { maxIter: 100, seed: 42 })
    const fitResult = hmm.fit([scaled], {
      onProgress: (iter, maxIter) => {
        const percent = 40 + Math.round((iter / maxIter) * 40)
        postProgress(percent, 'training')
      },
    })

    postProgress(80, 'predicting')

    // Predict states
    const states = hmm.predict(scaled)

    self.postMessage({
      type: 'result',
      states,
      nStates,
      converged: fitResult.converged,
      iterations: fitResult.iterations,
      logLikelihood: fitResult.logLikelihood,
    } satisfies ResultMessage)
  } catch (err) {
    self.postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : 'HMM training failed in worker',
    } satisfies ErrorMessage)
  }
}

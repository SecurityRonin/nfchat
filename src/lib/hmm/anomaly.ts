/**
 * Anomaly scoring for HMM state profiles using Z-score analysis.
 *
 * Identifies unusual states by computing Z-scores across key metrics:
 * - bytes_ratio: IN_BYTES / OUT_BYTES ratio (asymmetric flows)
 * - duration: Average flow duration (long-lived connections)
 * - pkts_per_sec: Packet rate (DDoS, scanning patterns)
 * - protocol_skew: Protocol distribution deviation (ICMP floods, UDP scans)
 *
 * Returns per-state anomaly score (0-100) and top contributing factors.
 */

import type { StateProfile } from '@/lib/store/types'

export interface AnomalyScore {
  stateId: number
  anomalyScore: number
  anomalyFactors: string[]
}

interface Metric {
  name: string
  value: number
}

/**
 * Compute robust anomaly score using median absolute deviation (MAD).
 * More resistant to outliers than standard deviation in small samples.
 */
function computeMADScore(value: number, values: number[]): number {
  if (values.length === 0) {
    return 0
  }

  // Compute median
  const sorted = [...values].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]

  // Compute MAD (median absolute deviation)
  const deviations = values.map(v => Math.abs(v - median))
  const mad = [...deviations].sort((a, b) => a - b)[Math.floor(deviations.length / 2)]

  // Scale MAD to be comparable to standard deviation (multiply by 1.4826)
  const scaledMAD = mad * 1.4826

  if (scaledMAD === 0) {
    return 0
  }

  // Modified Z-score using MAD
  return Math.abs((value - median) / scaledMAD)
}

/**
 * Compute protocol skew as max deviation from uniform distribution.
 * A uniform distribution would be 0.33 for each protocol.
 */
function computeProtocolSkew(protocolDist: { tcp: number; udp: number; icmp: number }): number {
  const uniform = 1 / 3
  const deviations = [
    Math.abs(protocolDist.tcp - uniform),
    Math.abs(protocolDist.udp - uniform),
    Math.abs(protocolDist.icmp - uniform),
  ]
  return Math.max(...deviations)
}

/**
 * Extract metrics from state profile for Z-score analysis.
 */
function extractMetrics(state: StateProfile): Metric[] {
  return [
    { name: 'bytes_ratio', value: state.bytesRatio },
    { name: 'duration', value: state.avgDurationMs },
    { name: 'pkts_per_sec', value: state.avgPktsPerSec },
    { name: 'protocol_skew', value: computeProtocolSkew(state.protocolDist) },
  ]
}

/**
 * Score anomalies across all states using Z-score analysis.
 *
 * @param states - Array of state profiles to analyze
 * @returns Array of anomaly scores with contributing factors
 */
export function scoreAnomalies(states: StateProfile[]): AnomalyScore[] {
  if (states.length === 0) {
    return []
  }

  if (states.length === 1) {
    return [{
      stateId: states[0].stateId,
      anomalyScore: 0,
      anomalyFactors: [],
    }]
  }

  // Extract metrics for all states
  const allMetrics = states.map(extractMetrics)
  const metricNames = allMetrics[0].map(m => m.name)

  // Collect all values for each metric
  const metricValues = new Map<string, number[]>()
  metricNames.forEach(name => {
    const values = allMetrics.map(metrics => metrics.find(m => m.name === name)!.value)
    metricValues.set(name, values)
  })

  // Compute anomaly scores for each state
  return states.map((state, idx) => {
    const metrics = allMetrics[idx]

    // Compute MAD-based Z-scores for each metric (more robust for small samples)
    const zScores = metrics.map(metric => ({
      name: metric.name,
      zScore: computeMADScore(metric.value, metricValues.get(metric.name)!),
    }))

    // Sort by Z-score descending and take top 3
    const topFactors = zScores
      .filter(z => z.zScore > 2.0) // Only include significant outliers (>2 std devs)
      .sort((a, b) => b.zScore - a.zScore)
      .slice(0, 3)
      .map(z => z.name)

    // Compute combined anomaly score (max Z-score capped at 100)
    // Using max instead of sum to avoid double-counting correlated metrics
    const maxZScore = Math.max(...zScores.map(z => z.zScore))
    // Scale: 2σ=40, 3σ=60, 5σ=100
    const anomalyScore = Math.min(100, Math.round(maxZScore * 20))

    return {
      stateId: state.stateId,
      anomalyScore,
      anomalyFactors: topFactors,
    }
  })
}

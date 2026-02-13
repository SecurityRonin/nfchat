import type { StateProfile } from '@/lib/store/types'

export interface TacticSuggestion {
  tactic: string
  confidence: number
  reasons: string[]
}

interface TacticHeuristic {
  name: string
  evaluate: (state: StateProfile) => { confidence: number; reasons: string[] }
}

/**
 * Heuristic rules for ATT&CK tactic suggestion based on traffic state profiles.
 * Each heuristic scores a StateProfile against a specific tactic pattern.
 * Exported for testability.
 */
export const TACTIC_HEURISTICS: TacticHeuristic[] = [
  {
    name: 'Reconnaissance',
    evaluate: (state) => {
      let score = 0
      const reasons: string[] = []

      const noReply = state.noReplyPct ?? 0
      const rejected = state.rejectedPct ?? 0

      if (noReply > 0.3) {
        score += 0.35
        reasons.push(`High no-reply rate (${(noReply * 100).toFixed(0)}%)`)
      } else if (noReply > 0.1) {
        score += 0.15
        reasons.push(`Elevated no-reply rate (${(noReply * 100).toFixed(0)}%)`)
      }

      if (rejected > 0.1) {
        score += 0.25
        reasons.push(`High rejected connection rate (${(rejected * 100).toFixed(0)}%)`)
      }

      if (state.avgDurationMs < 100) {
        score += 0.2
        reasons.push('Very short connection duration')
      } else if (state.avgDurationMs < 500) {
        score += 0.1
        reasons.push('Short connection duration')
      }

      const totalBytes = state.avgInBytes + state.avgOutBytes
      if (totalBytes < 500) {
        score += 0.15
        reasons.push('Low bytes per flow')
      }

      if (reasons.length === 0) {
        reasons.push('No strong reconnaissance indicators')
      }

      return { confidence: Math.min(1, score), reasons }
    },
  },
  {
    name: 'Command and Control',
    evaluate: (state) => {
      let score = 0
      const reasons: string[] = []

      const bytesPerPkt = state.avgBytesPerPkt ?? 0

      if (bytesPerPkt > 0 && bytesPerPkt < 200) {
        score += 0.3
        reasons.push(`Low bytes-per-pkt (${bytesPerPkt.toFixed(0)})`)
      }

      if (state.protocolDist.tcp > 0.8) {
        score += 0.15
        reasons.push('TCP-dominant traffic')
      }

      const totalBytes = state.avgInBytes + state.avgOutBytes
      if (totalBytes < 1000) {
        score += 0.15
        reasons.push('Low volume traffic')
      }

      const gapMs = state.avgInterFlowGapMs ?? 0
      if (gapMs > 5000) {
        score += 0.2
        reasons.push('Regular inter-flow timing (beaconing)')
      }

      const connComplete = state.connCompletePct ?? 0
      if (connComplete > 0.7) {
        score += 0.1
        reasons.push('Connections complete successfully')
      }

      if (reasons.length === 0) {
        reasons.push('No strong C2 indicators')
      }

      return { confidence: Math.min(1, score), reasons }
    },
  },
  {
    name: 'Exfiltration',
    evaluate: (state) => {
      let score = 0
      const reasons: string[] = []

      if (state.avgOutBytes > 10000) {
        score += 0.3
        reasons.push(`High outbound volume (${state.avgOutBytes.toFixed(0)} bytes)`)
      } else if (state.avgOutBytes > 5000) {
        score += 0.15
        reasons.push(`Elevated outbound volume (${state.avgOutBytes.toFixed(0)} bytes)`)
      }

      if (state.bytesRatio < 0.5) {
        score += 0.25
        reasons.push('Outbound-heavy byte ratio')
      } else if (state.bytesRatio < 1.0) {
        score += 0.1
        reasons.push('Slightly outbound-heavy ratio')
      }

      const bytesPerPkt = state.avgBytesPerPkt ?? 0
      if (bytesPerPkt > 1000) {
        score += 0.25
        reasons.push(`Large packets (${bytesPerPkt.toFixed(0)} bytes/pkt)`)
      }

      if (reasons.length === 0) {
        reasons.push('No strong exfiltration indicators')
      }

      return { confidence: Math.min(1, score), reasons }
    },
  },
  {
    name: 'Lateral Movement',
    evaluate: (state) => {
      let score = 0
      const reasons: string[] = []

      if (state.portCategoryDist.wellKnown > 0.6) {
        score += 0.25
        reasons.push('Targeting well-known service ports')
      }

      if (state.protocolDist.tcp > 0.8) {
        score += 0.2
        reasons.push('TCP-dominant (service connections)')
      }

      const connComplete = state.connCompletePct ?? 0
      if (connComplete > 0.5) {
        score += 0.2
        reasons.push('Moderate-to-high connection completion')
      }

      if (state.avgDurationMs > 1000 && state.avgDurationMs < 30000) {
        score += 0.15
        reasons.push('Medium-duration sessions')
      }

      if (reasons.length === 0) {
        reasons.push('No strong lateral movement indicators')
      }

      return { confidence: Math.min(1, score), reasons }
    },
  },
  {
    name: 'Discovery',
    evaluate: (state) => {
      let score = 0
      const reasons: string[] = []

      if (state.portCategoryDist.ephemeral > 0.6) {
        score += 0.25
        reasons.push('High ephemeral port usage (port scanning)')
      }

      if (state.avgDurationMs < 100) {
        score += 0.2
        reasons.push('Very short-lived connections')
      }

      const connComplete = state.connCompletePct ?? 0
      if (connComplete < 0.4) {
        score += 0.2
        reasons.push('Low connection completion rate')
      }

      const totalBytes = state.avgInBytes + state.avgOutBytes
      if (totalBytes < 500) {
        score += 0.15
        reasons.push('Minimal data exchange')
      }

      if (reasons.length === 0) {
        reasons.push('No strong discovery indicators')
      }

      return { confidence: Math.min(1, score), reasons }
    },
  },
  {
    name: 'Initial Access',
    evaluate: (state) => {
      let score = 0
      const reasons: string[] = []

      if (state.portCategoryDist.wellKnown > 0.5) {
        score += 0.15
        reasons.push('Targeting well-known ports')
      }

      const bytesPerPkt = state.avgBytesPerPkt ?? 0
      if (bytesPerPkt > 500) {
        score += 0.2
        reasons.push('Large packet payloads (potential exploit delivery)')
      }

      if (state.bytesRatio < 0.5) {
        score += 0.15
        reasons.push('Outbound-heavy traffic (payload delivery)')
      }

      const connComplete = state.connCompletePct ?? 0
      if (connComplete > 0.2 && connComplete < 0.6) {
        score += 0.15
        reasons.push('Partial connection success')
      }

      const rejected = state.rejectedPct ?? 0
      if (rejected > 0.02 && rejected < 0.15) {
        score += 0.1
        reasons.push('Some connections rejected')
      }

      if (state.avgDurationMs > 200 && state.avgDurationMs < 2000) {
        score += 0.1
        reasons.push('Short-to-medium duration (exploit window)')
      }

      if (reasons.length === 0) {
        reasons.push('No strong initial access indicators')
      }

      return { confidence: Math.min(1, score), reasons }
    },
  },
  {
    name: 'Normal',
    evaluate: (state) => {
      let score = 0
      const reasons: string[] = []

      const connComplete = state.connCompletePct ?? 0
      if (connComplete > 0.8) {
        score += 0.3
        reasons.push('High connection completion rate')
      } else if (connComplete > 0.6) {
        score += 0.15
        reasons.push('Moderate connection completion')
      }

      if (state.bytesRatio > 0.5 && state.bytesRatio < 5.0) {
        score += 0.2
        reasons.push('Balanced bidirectional traffic')
      }

      if (state.portCategoryDist.wellKnown > 0.4) {
        score += 0.15
        reasons.push('Standard port usage')
      }

      const noReply = state.noReplyPct ?? 0
      const rejected = state.rejectedPct ?? 0
      if (noReply < 0.05 && rejected < 0.05) {
        score += 0.15
        reasons.push('Low error rates')
      }

      if (state.avgDurationMs > 1000) {
        score += 0.1
        reasons.push('Sustained connections')
      }

      if (reasons.length === 0) {
        reasons.push('Default classification')
      }

      return { confidence: Math.min(1, score), reasons }
    },
  },
]

/**
 * Suggests the most likely ATT&CK tactic for an HMM state based on its traffic profile.
 *
 * Evaluates the state against all heuristic rules and returns the tactic with
 * the highest confidence score, along with reasons explaining the match.
 */
export function suggestTactic(state: StateProfile): TacticSuggestion {
  let bestTactic = 'Normal'
  let bestConfidence = 0
  let bestReasons: string[] = ['Default classification']

  for (const heuristic of TACTIC_HEURISTICS) {
    const { confidence, reasons } = heuristic.evaluate(state)
    if (confidence > bestConfidence) {
      bestTactic = heuristic.name
      bestConfidence = confidence
      bestReasons = reasons
    }
  }

  return {
    tactic: bestTactic,
    confidence: bestConfidence,
    reasons: bestReasons,
  }
}

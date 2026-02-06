/**
 * State analyzer: maps HMM state signatures to MITRE ATT&CK tactics.
 *
 * Ported from scripts/hmm/interpretation/mitre_mapper.py
 */

export interface StateSignature {
  stateId: number
  flowCount: number
  avgInBytes: number
  avgOutBytes: number
  bytesRatio: number
  avgDurationMs: number
  avgPktsPerSec: number
  protocolDist: { tcp: number; udp: number; icmp: number }
  portCategoryDist: { wellKnown: number; registered: number; ephemeral: number }
}

export interface TacticSuggestion {
  tactic: string
  confidence: number
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Reconnaissance / Discovery: low bytes, short duration, high pkt rate,
 * well-known ports.
 */
function reconnaissanceScore(sig: StateSignature): number {
  let score = 0

  // Low average bytes (< 500)
  if (sig.avgInBytes < 500 && sig.avgOutBytes < 500) {
    score += 0.3
  }

  // Short duration (< 1s)
  if (sig.avgDurationMs < 1000) {
    score += 0.2
  }

  // High packet rate (> 10 pps)
  if (sig.avgPktsPerSec > 10) {
    score += 0.2
  }

  // Targeting well-known ports
  if (sig.portCategoryDist.wellKnown > 0.5) {
    score += 0.3
  }

  return clamp(score)
}

/**
 * Exfiltration: high out bytes, low ratio, long duration, ephemeral ports.
 */
function exfiltrationScore(sig: StateSignature): number {
  let score = 0

  // High outbound bytes (> 10KB)
  if (sig.avgOutBytes > 10000) {
    score += 0.3
  }

  // Low bytes ratio (out >> in)
  if (sig.bytesRatio < 0.1) {
    score += 0.3
  }

  // Long duration (> 10s)
  if (sig.avgDurationMs > 10000) {
    score += 0.2
  }

  // Ephemeral ports
  if (sig.portCategoryDist.ephemeral > 0.5) {
    score += 0.2
  }

  return clamp(score)
}

/**
 * Command and Control: long duration, low pkt rate, balanced bytes,
 * ephemeral ports, TCP.
 */
function c2Score(sig: StateSignature): number {
  let score = 0

  // Long duration (> 30s)
  if (sig.avgDurationMs > 30000) {
    score += 0.3
  }

  // Low packet rate (< 2 pps - heartbeat)
  if (sig.avgPktsPerSec < 2) {
    score += 0.2
  }

  // Balanced bytes (ratio near 1)
  if (sig.bytesRatio > 0.5 && sig.bytesRatio < 2.0) {
    score += 0.1
  }

  // Ephemeral ports
  if (sig.portCategoryDist.ephemeral > 0.5) {
    score += 0.2
  }

  // Mostly TCP
  if (sig.protocolDist.tcp > 0.8) {
    score += 0.2
  }

  return clamp(score)
}

/**
 * Lateral Movement: moderate bytes, mixed ports, moderate duration, TCP.
 */
function lateralMovementScore(sig: StateSignature): number {
  let score = 0

  // Moderate bytes (1KB - 100KB)
  if (sig.avgInBytes > 1000 && sig.avgInBytes < 100000) {
    score += 0.2
  }

  // Mixed port categories
  if (sig.portCategoryDist.wellKnown > 0.2 && sig.portCategoryDist.registered > 0.2) {
    score += 0.3
  }

  // Moderate duration (1-30s)
  if (sig.avgDurationMs > 1000 && sig.avgDurationMs < 30000) {
    score += 0.2
  }

  // Mostly TCP (admin protocols)
  if (sig.protocolDist.tcp > 0.7) {
    score += 0.3
  }

  return clamp(score)
}

/**
 * Credential Access: low bytes, well-known ports, short duration, TCP.
 */
function credentialAccessScore(sig: StateSignature): number {
  let score = 0

  // Low bytes
  if (sig.avgInBytes < 1000 && sig.avgOutBytes < 1000) {
    score += 0.3
  }

  // Well-known ports (SSH, RDP, etc.)
  if (sig.portCategoryDist.wellKnown > 0.6) {
    score += 0.3
  }

  // Short-medium duration
  if (sig.avgDurationMs < 5000) {
    score += 0.2
  }

  // Mostly TCP
  if (sig.protocolDist.tcp > 0.9) {
    score += 0.2
  }

  return clamp(score)
}

/**
 * Benign: balanced ratio, mixed protocols, high flow count, mixed ports.
 */
function benignScore(sig: StateSignature): number {
  let score = 0

  // Balanced bytes ratio (0.5 - 2.0)
  if (sig.bytesRatio > 0.5 && sig.bytesRatio < 2.0) {
    score += 0.3
  }

  // Mixed protocols
  if (sig.protocolDist.tcp < 0.9 && sig.protocolDist.udp > 0.1) {
    score += 0.2
  }

  // High flow count (> 1000)
  if (sig.flowCount > 1000) {
    score += 0.2
  }

  // Mixed port distribution
  if (sig.portCategoryDist.wellKnown > 0.2 && sig.portCategoryDist.registered > 0.2) {
    score += 0.3
  }

  return clamp(score)
}

interface TacticProfile {
  tactic: string
  scoreFn: (sig: StateSignature) => number
}

const TACTIC_PROFILES: TacticProfile[] = [
  { tactic: 'Reconnaissance', scoreFn: reconnaissanceScore },
  { tactic: 'Discovery', scoreFn: reconnaissanceScore }, // Similar to recon
  { tactic: 'Credential Access', scoreFn: credentialAccessScore },
  { tactic: 'Lateral Movement', scoreFn: lateralMovementScore },
  { tactic: 'Command and Control', scoreFn: c2Score },
  { tactic: 'Exfiltration', scoreFn: exfiltrationScore },
  { tactic: 'Benign', scoreFn: benignScore },
]

/**
 * Score a state signature against all MITRE tactic profiles
 * and return the best match.
 */
export function suggestTactic(signature: StateSignature): TacticSuggestion {
  let bestTactic = 'Unknown'
  let bestScore = 0

  for (const profile of TACTIC_PROFILES) {
    const score = profile.scoreFn(signature)
    if (score > bestScore) {
      bestScore = score
      bestTactic = profile.tactic
    }
  }

  return { tactic: bestTactic, confidence: bestScore }
}

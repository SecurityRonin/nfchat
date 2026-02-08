import type { StateProfile } from '@/lib/store/types'

/**
 * Generates a human-readable narrative description of an HMM state's traffic profile.
 *
 * Uses thresholds to classify traffic characteristics and produces a 1-2 sentence
 * description suitable for display in UI cards.
 *
 * @param state - The state profile containing traffic metrics
 * @returns A narrative string describing the state's behavior
 */
export function generateNarrative(state: StateProfile): string {
  // Classify traffic volume based on average bytes
  const totalBytes = state.avgInBytes + state.avgOutBytes
  const volumeClass = classifyVolume(totalBytes)

  // Classify flow direction
  const directionDesc = classifyDirection(state.avgInBytes, state.avgOutBytes, state.bytesRatio)

  // Classify duration
  const durationClass = classifyDuration(state.avgDurationMs)

  // Determine dominant protocol
  const protocolDesc = classifyProtocol(state.protocolDist)

  // Classify port usage
  const portDesc = classifyPorts(state.portCategoryDist)

  // Build narrative components
  const parts: string[] = []

  // Lead with duration and volume
  parts.push(`${durationClass} ${volumeClass}`)

  // Add protocol info
  parts.push(protocolDesc)

  // Add direction if significant
  if (directionDesc) {
    parts.push(directionDesc)
  }

  // Add port category if relevant
  if (portDesc) {
    parts.push(`targeting ${portDesc}`)
  }

  return parts.join(' ') + '.'
}

/**
 * Classifies traffic volume based on total bytes per flow
 */
function classifyVolume(totalBytes: number): string {
  if (totalBytes < 1000) return 'low-volume'
  if (totalBytes < 50000) return 'medium-volume'
  return 'high-volume'
}

/**
 * Classifies flow direction and balance
 */
function classifyDirection(inBytes: number, outBytes: number, _ratio: number): string {
  const total = inBytes + outBytes
  if (total === 0) return ''

  const inPct = inBytes / total
  const outPct = outBytes / total

  // Balanced traffic
  if (inPct > 0.4 && inPct < 0.6) {
    return 'bidirectional flows'
  }

  // Inbound-heavy
  if (inPct > 0.7) {
    return 'inbound-heavy flows'
  }

  // Outbound-heavy
  if (outPct > 0.7) {
    return 'outbound-heavy flows'
  }

  return ''
}

/**
 * Classifies connection duration
 */
function classifyDuration(durationMs: number): string {
  if (durationMs < 100) return 'short-duration'
  if (durationMs < 10000) return 'medium-duration'
  return 'long-duration'
}

/**
 * Determines the dominant protocol or mix
 */
function classifyProtocol(dist: { tcp: number; udp: number; icmp: number }): string {
  const { tcp, udp, icmp } = dist

  // Handle edge case where all are zero
  if (tcp === 0 && udp === 0 && icmp === 0) {
    return 'flows with unknown protocol'
  }

  // Single dominant protocol (>80%)
  if (tcp > 0.8) return 'TCP flows'
  if (udp > 0.8) return 'UDP flows'
  if (icmp > 0.8) return 'ICMP flows'

  // Two-protocol mix
  if (tcp > 0.4 && udp > 0.4) return 'mixed protocol (TCP/UDP) flows'
  if (tcp > 0.4 && icmp > 0.2) return 'mixed protocol (TCP/ICMP) flows'
  if (udp > 0.4 && icmp > 0.2) return 'mixed protocol (UDP/ICMP) flows'

  // Default to mentioning the dominant one
  if (tcp >= udp && tcp >= icmp) return 'predominantly TCP flows'
  if (udp >= tcp && udp >= icmp) return 'predominantly UDP flows'
  return 'predominantly ICMP flows'
}

/**
 * Classifies port category usage
 */
function classifyPorts(dist: { wellKnown: number; registered: number; ephemeral: number }): string {
  const { wellKnown, registered, ephemeral } = dist

  // Handle edge case where all are zero (e.g., ICMP)
  if (wellKnown === 0 && registered === 0 && ephemeral === 0) {
    return ''
  }

  // Dominant category (>60%)
  if (wellKnown > 0.6) return 'well-known ports'
  if (ephemeral > 0.6) return 'ephemeral ports'
  if (registered > 0.6) return 'registered ports'

  // Mixed usage
  return 'mixed port ranges'
}

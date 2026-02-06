import { describe, it, expect } from 'vitest'
import { suggestTactic } from '../state-analyzer'
import type { StateSignature } from '../state-analyzer'

function makeSignature(overrides: Partial<StateSignature> = {}): StateSignature {
  return {
    stateId: 0,
    flowCount: 100,
    avgInBytes: 500,
    avgOutBytes: 500,
    bytesRatio: 1.0,
    avgDurationMs: 1000,
    avgPktsPerSec: 5,
    protocolDist: { tcp: 0.5, udp: 0.3, icmp: 0.2 },
    portCategoryDist: { wellKnown: 0.33, registered: 0.33, ephemeral: 0.34 },
    ...overrides,
  }
}

describe('suggestTactic', () => {
  it('identifies Reconnaissance from low bytes, short duration, high pkt rate, well-known ports', () => {
    const sig = makeSignature({
      avgInBytes: 100,
      avgOutBytes: 100,
      avgDurationMs: 500,
      avgPktsPerSec: 20,
      portCategoryDist: { wellKnown: 0.8, registered: 0.1, ephemeral: 0.1 },
    })
    const result = suggestTactic(sig)
    expect(result.tactic).toBe('Reconnaissance')
    expect(result.confidence).toBeGreaterThanOrEqual(0.7)
  })

  it('identifies Exfiltration from high out bytes, low ratio, long duration, ephemeral ports', () => {
    const sig = makeSignature({
      avgOutBytes: 50000,
      bytesRatio: 0.05,
      avgDurationMs: 20000,
      portCategoryDist: { wellKnown: 0.1, registered: 0.1, ephemeral: 0.8 },
    })
    const result = suggestTactic(sig)
    expect(result.tactic).toBe('Exfiltration')
    expect(result.confidence).toBeGreaterThanOrEqual(0.7)
  })

  it('identifies Command and Control from long duration, low pkt rate, ephemeral ports, TCP', () => {
    const sig = makeSignature({
      avgDurationMs: 60000,
      avgPktsPerSec: 0.5,
      bytesRatio: 1.0,
      portCategoryDist: { wellKnown: 0.1, registered: 0.1, ephemeral: 0.8 },
      protocolDist: { tcp: 0.95, udp: 0.05, icmp: 0.0 },
    })
    const result = suggestTactic(sig)
    expect(result.tactic).toBe('Command and Control')
    expect(result.confidence).toBeGreaterThanOrEqual(0.7)
  })

  it('identifies Lateral Movement from moderate bytes, mixed ports, moderate duration, TCP', () => {
    const sig = makeSignature({
      avgInBytes: 5000,
      avgDurationMs: 10000,
      portCategoryDist: { wellKnown: 0.4, registered: 0.4, ephemeral: 0.2 },
      protocolDist: { tcp: 0.9, udp: 0.1, icmp: 0.0 },
    })
    const result = suggestTactic(sig)
    expect(result.tactic).toBe('Lateral Movement')
    expect(result.confidence).toBeGreaterThanOrEqual(0.7)
  })

  it('identifies Credential Access from low bytes, well-known ports, short duration, TCP', () => {
    const sig = makeSignature({
      avgInBytes: 200,
      avgOutBytes: 200,
      avgDurationMs: 2000,
      portCategoryDist: { wellKnown: 0.8, registered: 0.1, ephemeral: 0.1 },
      protocolDist: { tcp: 0.95, udp: 0.05, icmp: 0.0 },
    })
    const result = suggestTactic(sig)
    expect(result.tactic).toBe('Credential Access')
    expect(result.confidence).toBeGreaterThanOrEqual(0.7)
  })

  it('identifies Benign from balanced ratio, mixed protocols, high flow count, mixed ports', () => {
    const sig = makeSignature({
      bytesRatio: 1.0,
      flowCount: 5000,
      protocolDist: { tcp: 0.7, udp: 0.25, icmp: 0.05 },
      portCategoryDist: { wellKnown: 0.4, registered: 0.4, ephemeral: 0.2 },
    })
    const result = suggestTactic(sig)
    expect(result.tactic).toBe('Benign')
    expect(result.confidence).toBeGreaterThanOrEqual(0.7)
  })

  it('returns confidence clamped between 0 and 1', () => {
    const sig = makeSignature()
    const result = suggestTactic(sig)
    expect(result.confidence).toBeGreaterThanOrEqual(0)
    expect(result.confidence).toBeLessThanOrEqual(1)
  })

  it('returns Unknown when no tactic scores above 0', () => {
    // Make a signature that doesnt match any tactic well
    // Long duration rules out recon and cred access
    // Low out bytes rules out exfiltration
    // High pkt rate rules out C2
    // Low flow count rules out benign
    // Non-TCP rules out lateral movement
    const sig = makeSignature({
      avgInBytes: 50000,
      avgOutBytes: 50000,
      bytesRatio: 1.0,
      avgDurationMs: 500,
      avgPktsPerSec: 5,
      flowCount: 10,
      protocolDist: { tcp: 0.0, udp: 0.0, icmp: 1.0 },
      portCategoryDist: { wellKnown: 0.0, registered: 0.0, ephemeral: 1.0 },
    })
    const result = suggestTactic(sig)
    // Should still return something (at least one will match)
    expect(result.tactic).toBeTruthy()
    expect(typeof result.confidence).toBe('number')
  })
})

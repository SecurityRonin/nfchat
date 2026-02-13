import { describe, it, expect } from 'vitest'
import { suggestTactic, TACTIC_HEURISTICS } from '../tactic-suggester'
import type { StateProfile } from '@/lib/store/types'

describe('suggestTactic', () => {
  const createState = (overrides: Partial<StateProfile> = {}): StateProfile => ({
    stateId: 0,
    flowCount: 100,
    avgInBytes: 1000,
    avgOutBytes: 500,
    bytesRatio: 2.0,
    avgDurationMs: 5000,
    avgPktsPerSec: 10,
    protocolDist: { tcp: 0.8, udp: 0.15, icmp: 0.05 },
    portCategoryDist: { wellKnown: 0.5, registered: 0.3, ephemeral: 0.2 },
    ...overrides,
  })

  describe('return shape', () => {
    it('returns tactic, confidence, and reasons', () => {
      const result = suggestTactic(createState())
      expect(result).toHaveProperty('tactic')
      expect(result).toHaveProperty('confidence')
      expect(result).toHaveProperty('reasons')
      expect(typeof result.tactic).toBe('string')
      expect(typeof result.confidence).toBe('number')
      expect(Array.isArray(result.reasons)).toBe(true)
    })

    it('confidence is between 0 and 1', () => {
      const result = suggestTactic(createState())
      expect(result.confidence).toBeGreaterThanOrEqual(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
    })

    it('reasons array is non-empty', () => {
      const result = suggestTactic(createState())
      expect(result.reasons.length).toBeGreaterThan(0)
    })
  })

  describe('Reconnaissance detection', () => {
    it('suggests Reconnaissance for high noReplyPct with short duration', () => {
      const state = createState({
        noReplyPct: 0.5,
        avgDurationMs: 50,
        avgInBytes: 100,
        avgOutBytes: 80,
      })
      const result = suggestTactic(state)
      expect(result.tactic).toBe('Reconnaissance')
      expect(result.confidence).toBeGreaterThan(0.5)
      expect(result.reasons.some(r => /no.?reply/i.test(r))).toBe(true)
    })

    it('suggests Reconnaissance for high rejectedPct', () => {
      const state = createState({
        rejectedPct: 0.2,
        avgDurationMs: 30,
        avgInBytes: 50,
        avgOutBytes: 40,
      })
      const result = suggestTactic(state)
      expect(result.tactic).toBe('Reconnaissance')
      expect(result.reasons.some(r => /reject/i.test(r))).toBe(true)
    })
  })

  describe('Command and Control detection', () => {
    it('suggests C2 for low bytes-per-packet TCP beaconing pattern', () => {
      const state = createState({
        avgBytesPerPkt: 80,
        avgInterFlowGapMs: 30000,
        avgInBytes: 200,
        avgOutBytes: 150,
        protocolDist: { tcp: 0.95, udp: 0.04, icmp: 0.01 },
        connCompletePct: 0.9,
      })
      const result = suggestTactic(state)
      expect(result.tactic).toBe('Command and Control')
      expect(result.confidence).toBeGreaterThan(0.4)
      expect(result.reasons.some(r => /bytes.per.pkt|small.packet/i.test(r))).toBe(true)
    })
  })

  describe('Exfiltration detection', () => {
    it('suggests Exfiltration for outbound-heavy high-volume traffic', () => {
      const state = createState({
        avgOutBytes: 50000,
        avgInBytes: 500,
        bytesRatio: 0.01,
        avgBytesPerPkt: 1400,
      })
      const result = suggestTactic(state)
      expect(result.tactic).toBe('Exfiltration')
      expect(result.confidence).toBeGreaterThan(0.5)
      expect(result.reasons.some(r => /outbound|exfil/i.test(r))).toBe(true)
    })
  })

  describe('Lateral Movement detection', () => {
    it('suggests Lateral Movement for TCP on well-known ports with completed connections', () => {
      const state = createState({
        portCategoryDist: { wellKnown: 0.8, registered: 0.1, ephemeral: 0.1 },
        protocolDist: { tcp: 0.9, udp: 0.08, icmp: 0.02 },
        connCompletePct: 0.7,
        avgDurationMs: 2000,
      })
      const result = suggestTactic(state)
      expect(result.tactic).toBe('Lateral Movement')
      expect(result.confidence).toBeGreaterThan(0.4)
    })
  })

  describe('Discovery detection', () => {
    it('suggests Discovery for high ephemeral port usage with short connections', () => {
      const state = createState({
        portCategoryDist: { wellKnown: 0.1, registered: 0.1, ephemeral: 0.8 },
        avgDurationMs: 80,
        connCompletePct: 0.3,
        avgInBytes: 200,
        avgOutBytes: 100,
      })
      const result = suggestTactic(state)
      expect(result.tactic).toBe('Discovery')
      expect(result.confidence).toBeGreaterThan(0.3)
    })
  })

  describe('Initial Access detection', () => {
    it('suggests Initial Access for exploit-like patterns on well-known ports', () => {
      const state = createState({
        portCategoryDist: { wellKnown: 0.7, registered: 0.2, ephemeral: 0.1 },
        avgBytesPerPkt: 800,
        bytesRatio: 0.3,
        connCompletePct: 0.4,
        rejectedPct: 0.05,
        avgDurationMs: 500,
      })
      const result = suggestTactic(state)
      expect(result.tactic).toBe('Initial Access')
      expect(result.confidence).toBeGreaterThan(0.3)
    })
  })

  describe('Normal fallback', () => {
    it('suggests Normal for healthy traffic profile', () => {
      const state = createState({
        connCompletePct: 0.95,
        bytesRatio: 1.5,
        portCategoryDist: { wellKnown: 0.7, registered: 0.2, ephemeral: 0.1 },
        noReplyPct: 0.01,
        rejectedPct: 0.01,
        avgBytesPerPkt: 500,
        avgDurationMs: 5000,
      })
      const result = suggestTactic(state)
      expect(result.tactic).toBe('Normal')
      expect(result.confidence).toBeGreaterThan(0.5)
    })
  })

  describe('missing optional fields', () => {
    it('handles state with no optional fields gracefully', () => {
      const state = createState()
      // No connCompletePct, noReplyPct, rejectedPct, etc.
      const result = suggestTactic(state)
      expect(result.tactic).toBeDefined()
      expect(result.confidence).toBeGreaterThanOrEqual(0)
      expect(result.reasons.length).toBeGreaterThan(0)
    })
  })

  describe('highest confidence wins', () => {
    it('returns the tactic with highest confidence when multiple match', () => {
      // This state has some recon signals AND some normal signals
      const state = createState({
        noReplyPct: 0.1,
        connCompletePct: 0.5,
        avgDurationMs: 200,
      })
      const result = suggestTactic(state)
      // Should return whichever has highest confidence, not error
      expect(result.confidence).toBeGreaterThan(0)
    })
  })

  describe('TACTIC_HEURISTICS export', () => {
    it('exports TACTIC_HEURISTICS as a non-empty array', () => {
      expect(Array.isArray(TACTIC_HEURISTICS)).toBe(true)
      expect(TACTIC_HEURISTICS.length).toBeGreaterThan(0)
    })

    it('each heuristic has name and evaluate function', () => {
      TACTIC_HEURISTICS.forEach(h => {
        expect(typeof h.name).toBe('string')
        expect(typeof h.evaluate).toBe('function')
      })
    })
  })
})

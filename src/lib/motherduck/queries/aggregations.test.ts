/**
 * Tests for aggregation queries including Kill Chain / MITRE ATT&CK functions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the executor before importing the module
const mockExecuteQuery = vi.fn()
vi.mock('./executor', () => ({
  executeQuery: (...args: unknown[]) => mockExecuteQuery(...args),
}))

import {
  getAttackDistribution,
  getTopTalkers,
  getProtocolDistribution,
  getTimelineData,
  getNetworkGraph,
  getAttackSessions,
  getKillChainPhases,
  getMitreTacticDistribution,
  getMitreTechniqueDistribution,
} from './aggregations'

describe('aggregations queries', () => {
  beforeEach(() => {
    mockExecuteQuery.mockReset()
    mockExecuteQuery.mockResolvedValue([])
  })

  describe('getAttackDistribution', () => {
    it('returns attack distribution grouped by attack type', async () => {
      const mockData = [
        { attack: 'DDoS', count: 100 },
        { attack: 'Benign', count: 50 },
      ]
      mockExecuteQuery.mockResolvedValue(mockData)

      const result = await getAttackDistribution()

      expect(result).toEqual(mockData)
      expect(mockExecuteQuery).toHaveBeenCalledTimes(1)
      const sql = mockExecuteQuery.mock.calls[0][0] as string
      expect(sql).toContain('SELECT Attack as attack')
      expect(sql).toContain('COUNT(*) as count')
      expect(sql).toContain('GROUP BY Attack')
      expect(sql).toContain('ORDER BY count DESC')
    })
  })

  describe('getTopTalkers', () => {
    it('returns top source IPs by flow count', async () => {
      const mockData = [
        { ip: '192.168.1.1', value: 500 },
        { ip: '10.0.0.1', value: 300 },
      ]
      mockExecuteQuery.mockResolvedValue(mockData)

      const result = await getTopTalkers('src', 'flows', 10)

      expect(result).toEqual(mockData)
      const sql = mockExecuteQuery.mock.calls[0][0] as string
      expect(sql).toContain('IPV4_SRC_ADDR as ip')
      expect(sql).toContain('COUNT(*)')
      expect(sql).toContain('LIMIT 10')
    })

    it('returns top destination IPs by bytes', async () => {
      const mockData = [{ ip: '8.8.8.8', value: 1000000 }]
      mockExecuteQuery.mockResolvedValue(mockData)

      const result = await getTopTalkers('dst', 'bytes', 5, "Attack = 'DDoS'")

      expect(result).toEqual(mockData)
      const sql = mockExecuteQuery.mock.calls[0][0] as string
      expect(sql).toContain('IPV4_DST_ADDR as ip')
      expect(sql).toContain('SUM(IN_BYTES + OUT_BYTES)')
      expect(sql).toContain("Attack = 'DDoS'")
      expect(sql).toContain('LIMIT 5')
    })
  })

  describe('getProtocolDistribution', () => {
    it('returns protocol distribution', async () => {
      const mockData = [
        { protocol: 6, count: 1000 },
        { protocol: 17, count: 500 },
      ]
      mockExecuteQuery.mockResolvedValue(mockData)

      const result = await getProtocolDistribution()

      expect(result).toEqual(mockData)
      const sql = mockExecuteQuery.mock.calls[0][0] as string
      expect(sql).toContain('PROTOCOL as protocol')
      expect(sql).toContain('GROUP BY PROTOCOL')
    })

    it('applies where clause when provided', async () => {
      mockExecuteQuery.mockResolvedValue([])

      await getProtocolDistribution("Attack != 'Benign'")

      const sql = mockExecuteQuery.mock.calls[0][0] as string
      expect(sql).toContain("Attack != 'Benign'")
    })
  })

  describe('getTimelineData', () => {
    it('returns time-bucketed flow data', async () => {
      const mockData = [
        { time: 1609459200000, attack: 'DDoS', count: 50 },
        { time: 1609462800000, attack: 'Benign', count: 100 },
      ]
      mockExecuteQuery.mockResolvedValue(mockData)

      const result = await getTimelineData(60)

      expect(result).toEqual(mockData)
      const sql = mockExecuteQuery.mock.calls[0][0] as string
      // 60 minutes = 3600000 ms
      expect(sql).toContain('3600000')
      expect(sql).toContain('Attack as attack')
      expect(sql).toContain('GROUP BY time, attack')
    })
  })

  describe('getNetworkGraph', () => {
    it('returns network edges with weights', async () => {
      const mockData = [
        { source: '192.168.1.1', target: '10.0.0.1', weight: 100 },
      ]
      mockExecuteQuery.mockResolvedValue(mockData)

      const result = await getNetworkGraph(100)

      expect(result).toEqual(mockData)
      const sql = mockExecuteQuery.mock.calls[0][0] as string
      expect(sql).toContain('IPV4_SRC_ADDR as source')
      expect(sql).toContain('IPV4_DST_ADDR as target')
      expect(sql).toContain('COUNT(*) as weight')
      expect(sql).toContain('LIMIT 100')
    })
  })

  describe('getAttackSessions', () => {
    it('returns attack sessions with multi-tactic progression', async () => {
      const mockData = [
        {
          session_id: '192.168.1.1-12345',
          src_ip: '192.168.1.1',
          start_time: 1609459200000,
          end_time: 1609460100000,
          duration_minutes: 15,
          flow_count: 50,
          tactics: ['Reconnaissance', 'Initial Access'],
          techniques: ['T1595', 'T1190'],
          target_ips: ['10.0.0.1', '10.0.0.2'],
          target_ports: [80, 443],
          total_bytes: 100000,
        },
      ]
      mockExecuteQuery.mockResolvedValue(mockData)

      const result = await getAttackSessions(30, 2, 50)

      expect(result).toEqual(mockData)
      const sql = mockExecuteQuery.mock.calls[0][0] as string
      // 30 minutes = 1800000 ms
      expect(sql).toContain('1800000')
      expect(sql).toContain("Label = 'Attack'")
      expect(sql).toContain("MITRE_TACTIC != ''")
      expect(sql).toContain('len(tactics) >= 2')
      expect(sql).toContain('LIMIT 50')
    })

    it('uses default parameters when not specified', async () => {
      mockExecuteQuery.mockResolvedValue([])

      await getAttackSessions()

      const sql = mockExecuteQuery.mock.calls[0][0] as string
      // Default: 30 min window, 2 min tactics, 50 limit
      expect(sql).toContain('1800000') // 30 * 60 * 1000
      expect(sql).toContain('len(tactics) >= 2')
      expect(sql).toContain('LIMIT 50')
    })

    it('groups by source IP and time bucket', async () => {
      mockExecuteQuery.mockResolvedValue([])

      await getAttackSessions(60, 3, 20)

      const sql = mockExecuteQuery.mock.calls[0][0] as string
      expect(sql).toContain('IPV4_SRC_ADDR as src_ip')
      expect(sql).toContain('session_bucket')
      expect(sql).toContain('GROUP BY src_ip, session_bucket')
      // 60 min window
      expect(sql).toContain('3600000')
      expect(sql).toContain('len(tactics) >= 3')
      expect(sql).toContain('LIMIT 20')
    })

    it('collects distinct tactics and techniques', async () => {
      mockExecuteQuery.mockResolvedValue([])

      await getAttackSessions()

      const sql = mockExecuteQuery.mock.calls[0][0] as string
      expect(sql).toContain('LIST(DISTINCT MITRE_TACTIC)')
      expect(sql).toContain('LIST(DISTINCT MITRE_TECHNIQUE)')
      expect(sql).toContain('LIST(DISTINCT IPV4_DST_ADDR)')
    })
  })

  describe('getKillChainPhases', () => {
    it('returns kill chain phases for a specific session', async () => {
      const mockData = [
        {
          session_id: '192.168.1.1',
          src_ip: '192.168.1.1',
          tactic: 'Reconnaissance',
          technique: 'T1595',
          phase_start: 1609459200000,
          phase_end: 1609459500000,
          flow_count: 10,
          target_ips: ['10.0.0.1'],
          bytes_transferred: 5000,
        },
        {
          session_id: '192.168.1.1',
          src_ip: '192.168.1.1',
          tactic: 'Initial Access',
          technique: 'T1190',
          phase_start: 1609459600000,
          phase_end: 1609460100000,
          flow_count: 20,
          target_ips: ['10.0.0.1'],
          bytes_transferred: 15000,
        },
      ]
      mockExecuteQuery.mockResolvedValue(mockData)

      const result = await getKillChainPhases(
        '192.168.1.1',
        1609459200000,
        1609460100000
      )

      expect(result).toEqual(mockData)
      expect(result).toHaveLength(2)
    })

    it('filters by source IP and time range', async () => {
      mockExecuteQuery.mockResolvedValue([])

      await getKillChainPhases('10.0.0.5', 1000, 2000)

      const sql = mockExecuteQuery.mock.calls[0][0] as string
      expect(sql).toContain("IPV4_SRC_ADDR = '10.0.0.5'")
      expect(sql).toContain('FLOW_START_MILLISECONDS >= 1000')
      expect(sql).toContain('FLOW_END_MILLISECONDS <= 2000')
    })

    it('groups by tactic and technique', async () => {
      mockExecuteQuery.mockResolvedValue([])

      await getKillChainPhases('192.168.1.1', 1000, 2000)

      const sql = mockExecuteQuery.mock.calls[0][0] as string
      expect(sql).toContain('MITRE_TACTIC as tactic')
      expect(sql).toContain('MITRE_TECHNIQUE as technique')
      expect(sql).toContain('GROUP BY MITRE_TACTIC, MITRE_TECHNIQUE')
    })

    it('orders phases by start time', async () => {
      mockExecuteQuery.mockResolvedValue([])

      await getKillChainPhases('192.168.1.1', 1000, 2000)

      const sql = mockExecuteQuery.mock.calls[0][0] as string
      expect(sql).toContain('ORDER BY phase_start ASC')
    })

    it('excludes flows without MITRE tactic', async () => {
      mockExecuteQuery.mockResolvedValue([])

      await getKillChainPhases('192.168.1.1', 1000, 2000)

      const sql = mockExecuteQuery.mock.calls[0][0] as string
      expect(sql).toContain("MITRE_TACTIC != ''")
    })
  })

  describe('getMitreTacticDistribution', () => {
    it('returns tactic distribution for attack flows', async () => {
      const mockData = [
        { attack: 'Reconnaissance', count: 500 },
        { attack: 'Initial Access', count: 300 },
        { attack: 'Credential Access', count: 200 },
      ]
      mockExecuteQuery.mockResolvedValue(mockData)

      const result = await getMitreTacticDistribution()

      expect(result).toEqual(mockData)
      const sql = mockExecuteQuery.mock.calls[0][0] as string
      expect(sql).toContain('MITRE_TACTIC as attack')
      expect(sql).toContain('COUNT(*) as count')
      expect(sql).toContain('GROUP BY MITRE_TACTIC')
      expect(sql).toContain('ORDER BY count DESC')
    })

    it('excludes empty and null tactics', async () => {
      mockExecuteQuery.mockResolvedValue([])

      await getMitreTacticDistribution()

      const sql = mockExecuteQuery.mock.calls[0][0] as string
      expect(sql).toContain("MITRE_TACTIC != ''")
      expect(sql).toContain('MITRE_TACTIC IS NOT NULL')
    })
  })

  describe('getMitreTechniqueDistribution', () => {
    it('returns technique distribution with tactics', async () => {
      const mockData = [
        { technique: 'T1595', tactic: 'Reconnaissance', count: 200 },
        { technique: 'T1110', tactic: 'Credential Access', count: 150 },
      ]
      mockExecuteQuery.mockResolvedValue(mockData)

      const result = await getMitreTechniqueDistribution()

      expect(result).toEqual(mockData)
      const sql = mockExecuteQuery.mock.calls[0][0] as string
      expect(sql).toContain('MITRE_TECHNIQUE as technique')
      expect(sql).toContain('MITRE_TACTIC as tactic')
      expect(sql).toContain('GROUP BY MITRE_TECHNIQUE, MITRE_TACTIC')
    })

    it('limits results to top 20', async () => {
      mockExecuteQuery.mockResolvedValue([])

      await getMitreTechniqueDistribution()

      const sql = mockExecuteQuery.mock.calls[0][0] as string
      expect(sql).toContain('LIMIT 20')
    })

    it('excludes empty and null techniques', async () => {
      mockExecuteQuery.mockResolvedValue([])

      await getMitreTechniqueDistribution()

      const sql = mockExecuteQuery.mock.calls[0][0] as string
      expect(sql).toContain("MITRE_TECHNIQUE != ''")
      expect(sql).toContain('MITRE_TECHNIQUE IS NOT NULL')
    })
  })
})

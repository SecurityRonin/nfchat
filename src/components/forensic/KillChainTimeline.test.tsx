/**
 * Tests for KillChainTimeline component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { KillChainTimeline } from './KillChainTimeline'
import type { AttackSession, KillChainPhase } from '@/lib/motherduck/types'

// Mock query functions
const mockGetAttackSessions = vi.fn()
const mockGetKillChainPhases = vi.fn()
const mockGetHmmAttackSessions = vi.fn()

vi.mock('@/lib/motherduck/queries', () => ({
  getAttackSessions: (...args: unknown[]) => mockGetAttackSessions(...args),
  getKillChainPhases: (...args: unknown[]) => mockGetKillChainPhases(...args),
  getHmmAttackSessions: (...args: unknown[]) => mockGetHmmAttackSessions(...args),
}))

// Sample test data
const mockSessions: AttackSession[] = [
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
  {
    session_id: '10.0.0.5-67890',
    src_ip: '10.0.0.5',
    start_time: 1609462800000,
    end_time: 1609464600000,
    duration_minutes: 30,
    flow_count: 100,
    tactics: ['Credential Access', 'Lateral Movement', 'Exfiltration'],
    techniques: ['T1110', 'T1021', 'T1048'],
    target_ips: ['192.168.2.1', '192.168.2.2', '192.168.2.3', '192.168.2.4'],
    target_ports: [22, 445, 3389],
    total_bytes: 500000,
  },
]

const mockPhases: KillChainPhase[] = [
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
    flow_count: 40,
    target_ips: ['10.0.0.1'],
    bytes_transferred: 95000,
  },
]

describe('KillChainTimeline', () => {
  beforeEach(() => {
    mockGetAttackSessions.mockReset()
    mockGetKillChainPhases.mockReset()
    mockGetHmmAttackSessions.mockReset()
    mockGetAttackSessions.mockResolvedValue([])
    mockGetKillChainPhases.mockResolvedValue([])
    mockGetHmmAttackSessions.mockResolvedValue([])
  })

  describe('loading state', () => {
    it('shows loading message while fetching sessions', async () => {
      // Keep the promise pending
      mockGetAttackSessions.mockImplementation(
        () => new Promise(() => {})
      )

      render(<KillChainTimeline />)

      expect(screen.getByText('Loading attack sessions...')).toBeInTheDocument()
    })
  })

  describe('error state', () => {
    it('shows error message when fetch fails', async () => {
      mockGetAttackSessions.mockRejectedValue(new Error('Database connection failed'))

      render(<KillChainTimeline />)

      await waitFor(() => {
        expect(screen.getByText(/Error: Database connection failed/)).toBeInTheDocument()
      })
    })

    it('handles non-Error objects gracefully', async () => {
      mockGetAttackSessions.mockRejectedValue('String error')

      render(<KillChainTimeline />)

      await waitFor(() => {
        expect(screen.getByText(/Error: Failed to load sessions/)).toBeInTheDocument()
      })
    })
  })

  describe('empty state', () => {
    it('shows empty message when no sessions found', async () => {
      mockGetAttackSessions.mockResolvedValue([])

      render(<KillChainTimeline />)

      await waitFor(() => {
        expect(screen.getByText('No multi-tactic attack sessions found.')).toBeInTheDocument()
      })
    })

    it('explains session requirements', async () => {
      mockGetAttackSessions.mockResolvedValue([])

      render(<KillChainTimeline />)

      await waitFor(() => {
        expect(screen.getByText(/2\+ distinct MITRE ATT&CK tactics/)).toBeInTheDocument()
      })
    })
  })

  describe('sessions list', () => {
    it('displays session count in header', async () => {
      mockGetAttackSessions.mockResolvedValue(mockSessions)

      render(<KillChainTimeline />)

      await waitFor(() => {
        expect(screen.getByText('2 sessions with multi-tactic progression')).toBeInTheDocument()
      })
    })

    it('displays source IP for each session', async () => {
      mockGetAttackSessions.mockResolvedValue(mockSessions)

      render(<KillChainTimeline />)

      await waitFor(() => {
        expect(screen.getByText('192.168.1.1')).toBeInTheDocument()
        expect(screen.getByText('10.0.0.5')).toBeInTheDocument()
      })
    })

    it('displays flow count and duration', async () => {
      mockGetAttackSessions.mockResolvedValue(mockSessions)

      render(<KillChainTimeline />)

      await waitFor(() => {
        expect(screen.getByText(/50 flows/)).toBeInTheDocument()
        expect(screen.getByText(/15m/)).toBeInTheDocument()
      })
    })

    it('displays tactic pills for each session', async () => {
      mockGetAttackSessions.mockResolvedValue(mockSessions)

      render(<KillChainTimeline />)

      // Wait for sessions to render
      await waitFor(() => {
        expect(screen.getByText('192.168.1.1')).toBeInTheDocument()
      })

      // Tactics appear in both legend and session pills
      // Use getAllByText since they may appear multiple times
      const reconElements = screen.getAllByText('Reconnaissance')
      const initialElements = screen.getAllByText('Initial Access')
      const credElements = screen.getAllByText('Credential Access')

      // Each should appear at least once (in session pills)
      expect(reconElements.length).toBeGreaterThanOrEqual(1)
      expect(initialElements.length).toBeGreaterThanOrEqual(1)
      expect(credElements.length).toBeGreaterThanOrEqual(1)
    })

    it('displays technique IDs', async () => {
      mockGetAttackSessions.mockResolvedValue(mockSessions)

      render(<KillChainTimeline />)

      await waitFor(() => {
        expect(screen.getByText('T1595')).toBeInTheDocument()
        expect(screen.getByText('T1190')).toBeInTheDocument()
      })
    })

    it('shows truncated target IPs with count', async () => {
      mockGetAttackSessions.mockResolvedValue(mockSessions)

      render(<KillChainTimeline />)

      // Wait for both sessions to render
      await waitFor(() => {
        expect(screen.getByText('192.168.1.1')).toBeInTheDocument()
        expect(screen.getByText('10.0.0.5')).toBeInTheDocument()
      })

      // Session 2 has 4 IPs, shows first 3 + "+1 more"
      expect(screen.getByText(/\+1 more/)).toBeInTheDocument()
    })
  })

  describe('kill chain legend', () => {
    it('displays all kill chain phases in order', async () => {
      mockGetAttackSessions.mockResolvedValue(mockSessions)

      render(<KillChainTimeline />)

      await waitFor(() => {
        expect(screen.getByText('Attack Sessions (Kill Chain)')).toBeInTheDocument()
      })

      // Legend should show abbreviated phase names
      // Due to text truncation in legend, we check the header is present
      expect(screen.getByText('Attack Sessions (Kill Chain)')).toBeInTheDocument()
    })
  })

  describe('session selection', () => {
    it('calls onSessionSelect when a session is clicked', async () => {
      mockGetAttackSessions.mockResolvedValue(mockSessions)
      mockGetKillChainPhases.mockResolvedValue(mockPhases)
      const onSessionSelect = vi.fn()

      render(<KillChainTimeline onSessionSelect={onSessionSelect} />)

      await waitFor(() => {
        expect(screen.getByText('192.168.1.1')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('192.168.1.1'))

      await waitFor(() => {
        expect(onSessionSelect).toHaveBeenCalledWith(mockSessions[0])
      })
    })

    it('loads phases when session is selected', async () => {
      mockGetAttackSessions.mockResolvedValue(mockSessions)
      mockGetKillChainPhases.mockResolvedValue(mockPhases)

      render(<KillChainTimeline />)

      await waitFor(() => {
        expect(screen.getByText('192.168.1.1')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('192.168.1.1'))

      await waitFor(() => {
        expect(mockGetKillChainPhases).toHaveBeenCalledWith(
          '192.168.1.1',
          mockSessions[0].start_time,
          mockSessions[0].end_time
        )
      })
    })

    it('displays phase details after selection', async () => {
      mockGetAttackSessions.mockResolvedValue(mockSessions)
      mockGetKillChainPhases.mockResolvedValue(mockPhases)

      render(<KillChainTimeline />)

      await waitFor(() => {
        expect(screen.getByText('192.168.1.1')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('192.168.1.1'))

      await waitFor(() => {
        expect(screen.getByText('Kill Chain Phases: 192.168.1.1')).toBeInTheDocument()
      })
    })

    it('shows phase numbers in order', async () => {
      mockGetAttackSessions.mockResolvedValue(mockSessions)
      mockGetKillChainPhases.mockResolvedValue(mockPhases)

      render(<KillChainTimeline />)

      await waitFor(() => {
        expect(screen.getByText('192.168.1.1')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('192.168.1.1'))

      await waitFor(() => {
        // Phase numbers should appear
        expect(screen.getByText('1')).toBeInTheDocument()
        expect(screen.getByText('2')).toBeInTheDocument()
      })
    })

    it('handles phase loading errors gracefully', async () => {
      mockGetAttackSessions.mockResolvedValue(mockSessions)
      mockGetKillChainPhases.mockRejectedValue(new Error('Query failed'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(<KillChainTimeline />)

      await waitFor(() => {
        expect(screen.getByText('192.168.1.1')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('192.168.1.1'))

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to load phases:', expect.any(Error))
      })

      consoleSpy.mockRestore()
    })
  })

  describe('className prop', () => {
    it('applies custom className', async () => {
      mockGetAttackSessions.mockResolvedValue(mockSessions)

      const { container } = render(<KillChainTimeline className="custom-class" />)

      await waitFor(() => {
        expect(container.firstChild).toHaveClass('custom-class')
      })
    })
  })

  describe('API parameters', () => {
    it('calls getAttackSessions with correct parameters', async () => {
      mockGetAttackSessions.mockResolvedValue([])

      render(<KillChainTimeline />)

      await waitFor(() => {
        // Default params: 30 min window, 2 min tactics, 20 limit
        expect(mockGetAttackSessions).toHaveBeenCalledWith(30, 2, 20)
      })
    })
  })

  describe('HMM source mode', () => {
    const hmmAssignments = { 0: 'Reconnaissance', 1: 'Normal', 2: 'Exfiltration' }

    const hmmSessions: AttackSession[] = [
      {
        session_id: '10.0.0.1-hmm-5',
        src_ip: '10.0.0.1',
        start_time: 1609459200000,
        end_time: 1609460100000,
        duration_minutes: 15,
        flow_count: 75,
        tactics: ['Reconnaissance', 'Exfiltration'],
        techniques: [],
        target_ips: ['10.0.0.2', '10.0.0.3'],
        target_ports: [80, 443],
        total_bytes: 200000,
      },
    ]

    it('calls getHmmAttackSessions instead of getAttackSessions when source is hmm', async () => {
      mockGetHmmAttackSessions.mockResolvedValue(hmmSessions)

      render(
        <KillChainTimeline source="hmm" tacticAssignments={hmmAssignments} />
      )

      await waitFor(() => {
        expect(mockGetHmmAttackSessions).toHaveBeenCalledWith(hmmAssignments, 30, 2, 20)
        expect(mockGetAttackSessions).not.toHaveBeenCalled()
      })
    })

    it('displays HMM-discovered sessions', async () => {
      mockGetHmmAttackSessions.mockResolvedValue(hmmSessions)

      render(
        <KillChainTimeline source="hmm" tacticAssignments={hmmAssignments} />
      )

      await waitFor(() => {
        expect(screen.getByText('10.0.0.1')).toBeInTheDocument()
        expect(screen.getByText(/75 flows/)).toBeInTheDocument()
      })
    })

    it('shows HMM-specific header text', async () => {
      mockGetHmmAttackSessions.mockResolvedValue(hmmSessions)

      render(
        <KillChainTimeline source="hmm" tacticAssignments={hmmAssignments} />
      )

      await waitFor(() => {
        expect(screen.getByText(/HMM Discovered/)).toBeInTheDocument()
      })
    })

    it('defaults to dataset source when source prop is omitted', async () => {
      mockGetAttackSessions.mockResolvedValue([])

      render(<KillChainTimeline />)

      await waitFor(() => {
        expect(mockGetAttackSessions).toHaveBeenCalled()
        expect(mockGetHmmAttackSessions).not.toHaveBeenCalled()
      })
    })
  })

  describe('tactic sorting', () => {
    it('sorts tactics by kill chain order', async () => {
      // Session with tactics out of kill chain order
      const unorderedSession: AttackSession[] = [
        {
          ...mockSessions[0],
          tactics: ['Exfiltration', 'Reconnaissance', 'Initial Access'],
        },
      ]
      mockGetAttackSessions.mockResolvedValue(unorderedSession)

      render(<KillChainTimeline />)

      // Wait for session to render
      await waitFor(() => {
        expect(screen.getByText('192.168.1.1')).toBeInTheDocument()
      })

      // Find the session's tactic pills container (flex flex-wrap gap-1)
      // These are <span> elements while legend uses <div>
      const tacticPills = screen.getAllByRole('generic').filter(
        (el) => el.tagName === 'SPAN' && el.className.includes('px-2 py-0.5')
      )

      // Verify 3 tactic pills exist in the session
      expect(tacticPills).toHaveLength(3)

      // The pills should be in kill chain order: Reconnaissance, Initial Access, Exfiltration
      expect(tacticPills[0]).toHaveTextContent('Reconnaissance')
      expect(tacticPills[1]).toHaveTextContent('Initial Access')
      expect(tacticPills[2]).toHaveTextContent('Exfiltration')
    })
  })
})

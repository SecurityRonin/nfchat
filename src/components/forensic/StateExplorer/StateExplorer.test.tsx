import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StateExplorer } from './index'
import { useStore } from '@/lib/store'
import type { StateProfile } from '@/lib/store/types'

// Mock query functions
vi.mock('@/lib/motherduck/queries', () => ({
  extractFeatures: vi.fn().mockResolvedValue([]),
  ensureHmmStateColumn: vi.fn().mockResolvedValue(undefined),
  writeStateAssignments: vi.fn().mockResolvedValue(undefined),
  getStateSignatures: vi.fn().mockResolvedValue([]),
  getSampleFlows: vi.fn().mockResolvedValue([]),
  getStateTopHosts: vi.fn().mockResolvedValue({ srcHosts: [], dstHosts: [] }),
  getStateTimeline: vi.fn().mockResolvedValue([]),
  getStateConnStates: vi.fn().mockResolvedValue([]),
  getStatePortServices: vi.fn().mockResolvedValue({ ports: [], services: [] }),
  updateStateTactic: vi.fn().mockResolvedValue(undefined),
}))

// Mock HMM engine
vi.mock('@/lib/hmm', () => ({
  GaussianHMM: vi.fn().mockImplementation(() => ({
    fit: vi.fn().mockReturnValue({ logLikelihood: -100, iterations: 10, converged: true }),
    predict: vi.fn().mockReturnValue([0, 1, 0, 1]),
    bic: vi.fn().mockReturnValue(200),
  })),
  StandardScaler: vi.fn().mockImplementation(() => ({
    fitTransform: vi.fn().mockReturnValue([[0, 0], [1, 1]]),
  })),
  suggestTactic: vi.fn().mockReturnValue({ tactic: 'Benign', confidence: 0.8 }),
}))

const mockStates: StateProfile[] = [
  {
    stateId: 0,
    flowCount: 500,
    avgInBytes: 1024,
    avgOutBytes: 512,
    bytesRatio: 2.0,
    avgDurationMs: 2000,
    avgPktsPerSec: 5,
    protocolDist: { tcp: 0.8, udp: 0.15, icmp: 0.05 },
    portCategoryDist: { wellKnown: 0.5, registered: 0.3, ephemeral: 0.2 },
    suggestedTactic: 'Benign',
    suggestedConfidence: 0.8,
  },
  {
    stateId: 1,
    flowCount: 300,
    avgInBytes: 200,
    avgOutBytes: 100,
    bytesRatio: 2.0,
    avgDurationMs: 500,
    avgPktsPerSec: 20,
    protocolDist: { tcp: 0.6, udp: 0.3, icmp: 0.1 },
    portCategoryDist: { wellKnown: 0.7, registered: 0.2, ephemeral: 0.1 },
    suggestedTactic: 'Reconnaissance',
    suggestedConfidence: 0.9,
  },
]

describe('StateExplorer', () => {
  beforeEach(() => {
    useStore.setState({
      hmmStates: [],
      hmmTraining: false,
      hmmProgress: 0,
      hmmError: null,
      tacticAssignments: {},
      expandedState: null,
    })
  })

  it('renders empty state with discover prompt', () => {
    render(<StateExplorer />)
    expect(screen.getByText(/no states discovered/i)).toBeInTheDocument()
  })

  it('renders discovery controls', () => {
    render(<StateExplorer />)
    expect(screen.getByRole('button', { name: /discover states/i })).toBeInTheDocument()
  })

  it('shows training progress when hmmTraining is true', () => {
    useStore.setState({ hmmTraining: true, hmmProgress: 45 })
    render(<StateExplorer />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('renders state cards when states are discovered', () => {
    useStore.setState({ hmmStates: mockStates })
    render(<StateExplorer />)
    expect(screen.getByText('State 0')).toBeInTheDocument()
    expect(screen.getByText('State 1')).toBeInTheDocument()
    expect(screen.getByText(/500 flows/)).toBeInTheDocument()
    expect(screen.getByText(/300 flows/)).toBeInTheDocument()
  })

  it('shows error message when hmmError is set', () => {
    useStore.setState({ hmmError: 'Insufficient data for training' })
    render(<StateExplorer />)
    expect(screen.getByText(/insufficient data/i)).toBeInTheDocument()
  })

  it('renders save button when states are discovered', () => {
    useStore.setState({ hmmStates: mockStates })
    render(<StateExplorer />)
    expect(screen.getByRole('button', { name: /save all labels/i })).toBeInTheDocument()
  })

  it('updates tactic assignment in store when tactic is changed', async () => {
    const user = userEvent.setup()
    useStore.setState({ hmmStates: mockStates })
    render(<StateExplorer />)

    // Find the first combobox (State 0's tactic selector) - the one showing 'Benign'
    const benignSelect = screen.getByDisplayValue('Benign')
    await user.selectOptions(benignSelect, 'Exfiltration')

    expect(useStore.getState().tacticAssignments[0]).toBe('Exfiltration')
  })
})

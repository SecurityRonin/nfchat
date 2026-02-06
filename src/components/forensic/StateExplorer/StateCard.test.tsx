import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StateCard } from './StateCard'
import type { StateProfile } from '@/lib/store/types'

// Mock query functions
const mockGetSampleFlows = vi.fn()
const mockGetStateTopHosts = vi.fn()
const mockGetStateTimeline = vi.fn()
const mockGetStateConnStates = vi.fn()
const mockGetStatePortServices = vi.fn()

vi.mock('@/lib/motherduck/queries', () => ({
  getSampleFlows: (...args: unknown[]) => mockGetSampleFlows(...args),
  getStateTopHosts: (...args: unknown[]) => mockGetStateTopHosts(...args),
  getStateTimeline: (...args: unknown[]) => mockGetStateTimeline(...args),
  getStateConnStates: (...args: unknown[]) => mockGetStateConnStates(...args),
  getStatePortServices: (...args: unknown[]) => mockGetStatePortServices(...args),
}))

const mockState: StateProfile = {
  stateId: 0,
  flowCount: 1500,
  avgInBytes: 2048,
  avgOutBytes: 512,
  bytesRatio: 4.0,
  avgDurationMs: 3500,
  avgPktsPerSec: 12.5,
  protocolDist: { tcp: 0.75, udp: 0.2, icmp: 0.05 },
  portCategoryDist: { wellKnown: 0.6, registered: 0.3, ephemeral: 0.1 },
  suggestedTactic: 'Reconnaissance',
  suggestedConfidence: 0.85,
}

describe('StateCard', () => {
  beforeEach(() => {
    mockGetSampleFlows.mockReset()
    mockGetStateTopHosts.mockReset()
    mockGetStateTimeline.mockReset()
    mockGetStateConnStates.mockReset()
    mockGetStatePortServices.mockReset()

    mockGetSampleFlows.mockResolvedValue([])
    mockGetStateTopHosts.mockResolvedValue({ srcHosts: [], dstHosts: [] })
    mockGetStateTimeline.mockResolvedValue([])
    mockGetStateConnStates.mockResolvedValue([])
    mockGetStatePortServices.mockResolvedValue({ ports: [], services: [] })
  })

  it('renders state header with ID and flow count', () => {
    render(
      <StateCard
        state={mockState}
        onTacticAssign={vi.fn()}
        expanded={false}
        onToggleExpand={vi.fn()}
      />
    )
    expect(screen.getByText(/State 0/)).toBeInTheDocument()
    expect(screen.getByText(/1,500 flows/)).toBeInTheDocument()
  })

  it('renders traffic profile metrics', () => {
    render(
      <StateCard
        state={mockState}
        onTacticAssign={vi.fn()}
        expanded={false}
        onToggleExpand={vi.fn()}
      />
    )
    expect(screen.getByText(/avg in/i)).toBeInTheDocument()
    expect(screen.getByText(/avg out/i)).toBeInTheDocument()
    expect(screen.getByText(/duration/i)).toBeInTheDocument()
  })

  it('renders protocol distribution bars', () => {
    render(
      <StateCard
        state={mockState}
        onTacticAssign={vi.fn()}
        expanded={false}
        onToggleExpand={vi.fn()}
      />
    )
    expect(screen.getByText('TCP')).toBeInTheDocument()
    expect(screen.getByText('UDP')).toBeInTheDocument()
    expect(screen.getByText(/75%/)).toBeInTheDocument()
  })

  it('renders tactic selector with suggested tactic', () => {
    render(
      <StateCard
        state={mockState}
        onTacticAssign={vi.fn()}
        expanded={false}
        onToggleExpand={vi.fn()}
      />
    )
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Reconnaissance')).toBeInTheDocument()
  })

  it('calls onTacticAssign when tactic is changed', async () => {
    const user = userEvent.setup()
    const onTacticAssign = vi.fn()
    render(
      <StateCard
        state={mockState}
        onTacticAssign={onTacticAssign}
        expanded={false}
        onToggleExpand={vi.fn()}
      />
    )

    await user.selectOptions(screen.getByRole('combobox'), 'Exfiltration')
    expect(onTacticAssign).toHaveBeenCalledWith(0, 'Exfiltration')
  })

  it('loads detail data when expanded', async () => {
    mockGetStateTopHosts.mockResolvedValue({
      srcHosts: [{ ip: '10.0.0.1', count: 100 }],
      dstHosts: [{ ip: '192.168.1.1', count: 80 }],
    })
    mockGetStateConnStates.mockResolvedValue([
      { state: 'SF', count: 500 },
    ])
    mockGetStateTimeline.mockResolvedValue([
      { bucket: 0, count: 10 },
    ])

    render(
      <StateCard
        state={mockState}
        onTacticAssign={vi.fn()}
        expanded={true}
        onToggleExpand={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(mockGetStateTopHosts).toHaveBeenCalledWith(0)
    })

    await waitFor(() => {
      expect(screen.getByText('10.0.0.1')).toBeInTheDocument()
    })
  })

  it('calls onToggleExpand when expand button is clicked', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(
      <StateCard
        state={mockState}
        onTacticAssign={vi.fn()}
        expanded={false}
        onToggleExpand={onToggle}
      />
    )

    await user.click(screen.getByRole('button', { name: /sample flows/i }))
    expect(onToggle).toHaveBeenCalled()
  })
})

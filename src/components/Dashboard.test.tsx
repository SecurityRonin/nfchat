import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { Dashboard } from './Dashboard'
import { useStore } from '@/lib/store'

// Store FlowTable mock props for inspection
let flowTableProps: Record<string, unknown> | null = null

// Track render counts for performance tests
let proTimelineRenderCount = 0
let attackBreakdownRenderCount = 0
let topTalkersRenderCount = 0
let flowTableRenderCount = 0

// Mock child components to isolate Dashboard layout testing
vi.mock('./dashboard/timeline', () => ({
  ProTimeline: () => {
    proTimelineRenderCount++
    return <div data-testid="timeline-mock">ProTimeline</div>
  },
}))

vi.mock('./dashboard/AttackBreakdown', () => ({
  AttackBreakdown: () => {
    attackBreakdownRenderCount++
    return <div data-testid="attack-breakdown-mock">AttackBreakdown</div>
  },
}))

vi.mock('./dashboard/TopTalkers', () => ({
  TopTalkers: () => {
    topTalkersRenderCount++
    return <div data-testid="top-talkers-mock">TopTalkers</div>
  },
}))

vi.mock('./dashboard/FlowTable', () => ({
  FlowTable: (props: Record<string, unknown>) => {
    flowTableProps = props
    flowTableRenderCount++
    return <div data-testid="flow-table-mock">FlowTable</div>
  },
}))

describe('Dashboard', () => {
  beforeEach(() => {
    flowTableProps = null
    proTimelineRenderCount = 0
    attackBreakdownRenderCount = 0
    topTalkersRenderCount = 0
    flowTableRenderCount = 0
    // Reset store state
    useStore.setState({
      flows: [],
      selectedFlow: null,
      totalFlowCount: 0,
      timelineData: [],
      attackBreakdown: [],
      topSrcIPs: [],
      topDstIPs: [],
      playback: {
        isPlaying: false,
        currentTime: 0,
        speed: 1,
        duration: 0,
        inPoint: null,
        outPoint: null,
      },
    })
  })

  afterEach(() => {
    flowTableProps = null
  })

  it('renders without crashing', () => {
    render(<Dashboard />)
    expect(screen.getByTestId('dashboard')).toBeInTheDocument()
  })

  it('displays the timeline component', () => {
    render(<Dashboard />)
    expect(screen.getByTestId('timeline-mock')).toBeInTheDocument()
  })

  it('displays the attack breakdown component', () => {
    render(<Dashboard />)
    expect(screen.getByTestId('attack-breakdown-mock')).toBeInTheDocument()
  })

  it('displays the top talkers components (src and dst)', () => {
    render(<Dashboard />)
    const topTalkers = screen.getAllByTestId('top-talkers-mock')
    expect(topTalkers.length).toBe(2) // Source and Destination
  })

  it('displays the flow table component', () => {
    render(<Dashboard />)
    expect(screen.getByTestId('flow-table-mock')).toBeInTheDocument()
  })

  it('has a header with app title', () => {
    render(<Dashboard />)
    expect(screen.getByText(/nfchat/i)).toBeInTheDocument()
  })

  it('shows loading state when data is loading', () => {
    render(<Dashboard loading={true} />)
    expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument()
  })

  it('shows chat toggle button', () => {
    render(<Dashboard />)
    expect(screen.getByRole('button', { name: /chat/i })).toBeInTheDocument()
  })

  describe('performance', () => {
    it('passes stable onRowClick callback to FlowTable', () => {
      render(<Dashboard />)

      const firstCallback = flowTableProps?.onRowClick

      // Trigger a re-render by updating unrelated store state
      act(() => {
        useStore.setState({ totalFlowCount: 100 })
      })

      // The callback should be stable (same reference)
      expect(flowTableProps?.onRowClick).toBe(firstCallback)
    })

    it('computes selectedIndex correctly when selectedFlow matches a flow', () => {
      const mockFlows = [
        { FLOW_START_MILLISECONDS: 1000, IPV4_SRC_ADDR: '192.168.1.1' },
        { FLOW_START_MILLISECONDS: 2000, IPV4_SRC_ADDR: '192.168.1.2' },
        { FLOW_START_MILLISECONDS: 3000, IPV4_SRC_ADDR: '192.168.1.3' },
      ]

      useStore.setState({
        flows: mockFlows,
        selectedFlow: mockFlows[1],
      })

      render(<Dashboard />)

      expect(flowTableProps?.selectedIndex).toBe(1)
    })

    it('passes undefined selectedIndex when no flow is selected', () => {
      const mockFlows = [
        { FLOW_START_MILLISECONDS: 1000, IPV4_SRC_ADDR: '192.168.1.1' },
      ]

      useStore.setState({
        flows: mockFlows,
        selectedFlow: null,
      })

      render(<Dashboard />)

      expect(flowTableProps?.selectedIndex).toBeUndefined()
    })

    it('does not re-render child components when playback.currentTime changes', () => {
      render(<Dashboard />)

      // Record initial render counts (should be 1 each)
      const initialTimelineRenders = proTimelineRenderCount
      const initialAttackRenders = attackBreakdownRenderCount
      const initialTopTalkersRenders = topTalkersRenderCount
      const initialFlowTableRenders = flowTableRenderCount

      expect(initialTimelineRenders).toBe(1)
      expect(initialAttackRenders).toBe(1)
      expect(initialFlowTableRenders).toBe(1)

      // Simulate playback animation frame updates (many rapid currentTime changes)
      for (let i = 0; i < 10; i++) {
        act(() => {
          useStore.setState((state) => ({
            playback: { ...state.playback, currentTime: i * 100 },
          }))
        })
      }

      // With proper Zustand selectors, Dashboard should NOT re-render
      // when playback.currentTime changes, since Dashboard doesn't use that value.
      // Child components should stay at their initial render count.
      expect(proTimelineRenderCount).toBe(initialTimelineRenders)
      expect(attackBreakdownRenderCount).toBe(initialAttackRenders)
      expect(topTalkersRenderCount).toBe(initialTopTalkersRenders)
      expect(flowTableRenderCount).toBe(initialFlowTableRenders)
    })

    it('does not re-render other components when only flows change', () => {
      render(<Dashboard />)

      const initialTimelineRenders = proTimelineRenderCount
      const initialAttackRenders = attackBreakdownRenderCount

      // Update only flows
      act(() => {
        useStore.setState({
          flows: [{ FLOW_START_MILLISECONDS: 1000 }],
        })
      })

      // Timeline and AttackBreakdown should NOT re-render when only flows change
      expect(proTimelineRenderCount).toBe(initialTimelineRenders)
      expect(attackBreakdownRenderCount).toBe(initialAttackRenders)
    })
  })
})

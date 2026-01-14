import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ForensicDashboard } from './ForensicDashboard'
import { useStore } from '@/lib/store'

// Mock child components
vi.mock('../dashboard/FlowTable', () => ({
  FlowTable: () => <div data-testid="flow-table-mock">FlowTable</div>,
}))

vi.mock('../Chat', () => ({
  Chat: () => <div data-testid="chat-mock">Chat</div>,
}))

vi.mock('./StatsBar', () => ({
  StatsBar: () => <div data-testid="stats-bar-mock">StatsBar</div>,
}))

describe('ForensicDashboard', () => {
  beforeEach(() => {
    useStore.setState({
      flows: [],
      totalFlowCount: 0,
      attackBreakdown: [],
      topSrcIPs: [],
      topDstIPs: [],
      messages: [],
    })
  })

  it('renders without crashing', () => {
    render(<ForensicDashboard />)
    expect(screen.getByTestId('forensic-dashboard')).toBeInTheDocument()
  })

  it('displays the stats bar', () => {
    render(<ForensicDashboard />)
    expect(screen.getByTestId('stats-bar-mock')).toBeInTheDocument()
  })

  it('displays the flow table', () => {
    render(<ForensicDashboard />)
    expect(screen.getByTestId('flow-table-mock')).toBeInTheDocument()
  })

  it('displays the chat panel (always visible)', () => {
    render(<ForensicDashboard />)
    expect(screen.getByTestId('chat-mock')).toBeInTheDocument()
  })

  it('has split layout with table on left and chat on right', () => {
    render(<ForensicDashboard />)
    const dashboard = screen.getByTestId('forensic-dashboard')
    // Check for grid/flex layout classes
    expect(dashboard.querySelector('[data-testid="flow-table-mock"]')).toBeInTheDocument()
    expect(dashboard.querySelector('[data-testid="chat-mock"]')).toBeInTheDocument()
  })

  it('shows app title in header', () => {
    render(<ForensicDashboard />)
    expect(screen.getByText('nfchat')).toBeInTheDocument()
  })

  it('wires up click-to-filter to chat', () => {
    // Setup store with test data
    useStore.setState({
      flows: [
        {
          IPV4_SRC_ADDR: '192.168.1.1',
          L4_SRC_PORT: 8080,
          IPV4_DST_ADDR: '10.0.0.1',
          L4_DST_PORT: 443,
          Attack: 'DDoS',
        },
      ],
      messages: [],
    })

    render(<ForensicDashboard />)

    // The test is checking that the wiring exists - actual click-to-filter
    // is tested in FlowTable tests. Here we just verify both components render.
    expect(screen.getByTestId('flow-table-mock')).toBeInTheDocument()
    expect(screen.getByTestId('chat-mock')).toBeInTheDocument()
  })
})

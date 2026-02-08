import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StateTransitions } from './StateTransitions'
import type { StateTransition } from '@/lib/motherduck/queries/hmm'

const transitions: StateTransition[] = [
  { fromState: 0, toState: 0, count: 10 },
  { fromState: 0, toState: 1, count: 20 },
  { fromState: 1, toState: 0, count: 5 },
  { fromState: 1, toState: 1, count: 15 },
]

describe('StateTransitions', () => {
  it('renders a grid with header row and column', () => {
    render(<StateTransitions transitions={transitions} nStates={2} />)
    // S0 and S1 appear in both header and row label
    expect(screen.getAllByText('S0')).toHaveLength(2)
    expect(screen.getAllByText('S1')).toHaveLength(2)
  })

  it('renders transition counts in cells', () => {
    render(<StateTransitions transitions={transitions} nStates={2} />)
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
  })

  it('renders nothing when transitions are empty', () => {
    const { container } = render(
      <StateTransitions transitions={[]} nStates={0} />
    )
    expect(container.querySelector('table')).toBeNull()
  })

  it('shows 0 for missing transitions', () => {
    const sparse: StateTransition[] = [
      { fromState: 0, toState: 1, count: 42 },
    ]
    render(<StateTransitions transitions={sparse} nStates={2} />)
    expect(screen.getByText('42')).toBeInTheDocument()
    // Cells with no transitions should show 0
    expect(screen.getAllByText('0')).toHaveLength(3)
  })

  it('applies opacity based on count intensity', () => {
    const { container } = render(
      <StateTransitions transitions={transitions} nStates={2} />
    )
    const cells = container.querySelectorAll('td[data-count]')
    expect(cells.length).toBe(4)
    // Highest count (20) should have highest opacity
    const maxCell = Array.from(cells).find(
      (c) => c.getAttribute('data-count') === '20'
    )
    expect(maxCell).toBeDefined()
  })

  it('renders heading text', () => {
    render(<StateTransitions transitions={transitions} nStates={2} />)
    expect(screen.getByText('State Transitions')).toBeInTheDocument()
  })
})

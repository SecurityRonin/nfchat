import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StateBadge } from '../cells'
import { createFlowColumns } from '../columns'

// Mock ResizeObserver for any DOM operations
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock

beforeEach(() => {
  Element.prototype.getBoundingClientRect = vi.fn(() => ({
    width: 800,
    height: 400,
    top: 0,
    left: 0,
    bottom: 400,
    right: 800,
    x: 0,
    y: 0,
    toJSON: () => {},
  }))
})

describe('StateBadge', () => {
  it('renders state number in a badge', () => {
    render(<StateBadge value={3} />)
    expect(screen.getByText('S3')).toBeInTheDocument()
  })

  it('renders nothing for undefined value', () => {
    const { container } = render(<StateBadge value={undefined} />)
    expect(container.textContent).toBe('')
  })

  it('renders with a colored background', () => {
    render(<StateBadge value={0} />)
    const badge = screen.getByText('S0')
    expect(badge).toHaveClass('text-xs')
  })
})

describe('createFlowColumns', () => {
  it('includes HMM_STATE column after Attack', () => {
    const columns = createFlowColumns()
    const accessorKeys = columns.map((col) => ('accessorKey' in col ? col.accessorKey : undefined))
    const attackIndex = accessorKeys.indexOf('Attack')
    const hmmStateIndex = accessorKeys.indexOf('HMM_STATE')

    expect(hmmStateIndex).toBeGreaterThan(-1)
    expect(hmmStateIndex).toBe(attackIndex + 1)
  })

  it('HMM_STATE column has header "State"', () => {
    const columns = createFlowColumns()
    const hmmCol = columns.find(
      (col) => 'accessorKey' in col && col.accessorKey === 'HMM_STATE'
    )
    expect(hmmCol).toBeDefined()
    expect(hmmCol?.header).toBe('State')
  })
})

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StateTemporal } from './StateTemporal'
import type { TemporalBucket } from '@/lib/motherduck/queries/hmm'

const buckets: TemporalBucket[] = [
  { bucket: '2024-01-01 00:00:00', stateId: 0, count: 100 },
  { bucket: '2024-01-01 00:00:00', stateId: 1, count: 50 },
  { bucket: '2024-01-01 01:00:00', stateId: 0, count: 75 },
  { bucket: '2024-01-01 01:00:00', stateId: 1, count: 25 },
]

describe('StateTemporal', () => {
  it('renders a bar for each time bucket', () => {
    const { container } = render(
      <StateTemporal buckets={buckets} nStates={2} />
    )
    const bars = container.querySelectorAll('[data-bucket]')
    expect(bars).toHaveLength(2)
  })

  it('renders colored segments per state within each bar', () => {
    const { container } = render(
      <StateTemporal buckets={buckets} nStates={2} />
    )
    const segments = container.querySelectorAll('[data-state-id]')
    // 2 buckets x 2 states = 4 segments
    expect(segments).toHaveLength(4)
  })

  it('renders nothing when buckets are empty', () => {
    const { container } = render(
      <StateTemporal buckets={[]} nStates={0} />
    )
    expect(container.querySelector('[data-bucket]')).toBeNull()
  })

  it('renders time labels', () => {
    render(<StateTemporal buckets={buckets} nStates={2} />)
    // Should render bucket labels
    expect(screen.getByText(/00:00/)).toBeInTheDocument()
    expect(screen.getByText(/01:00/)).toBeInTheDocument()
  })

  it('renders heading text', () => {
    render(<StateTemporal buckets={buckets} nStates={2} />)
    expect(screen.getByText('Temporal Distribution')).toBeInTheDocument()
  })

  it('applies state colors to segments', () => {
    const { container } = render(
      <StateTemporal buckets={buckets} nStates={2} />
    )
    const segments = container.querySelectorAll('[data-state-id]')
    const firstSegment = segments[0] as HTMLElement
    expect(firstSegment.style.backgroundColor).toBeTruthy()
  })
})

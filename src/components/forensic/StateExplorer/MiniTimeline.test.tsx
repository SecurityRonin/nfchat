import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MiniTimeline } from './MiniTimeline'

describe('MiniTimeline', () => {
  it('renders an SVG element', () => {
    render(<MiniTimeline buckets={[{ bucket: 0, count: 10 }]} />)
    expect(screen.getByRole('img')).toBeInTheDocument()
  })

  it('renders nothing when buckets are empty', () => {
    const { container } = render(<MiniTimeline buckets={[]} />)
    expect(container.querySelector('svg')).toBeNull()
  })

  it('renders a polyline for the sparkline', () => {
    const buckets = [
      { bucket: 0, count: 5 },
      { bucket: 1, count: 10 },
      { bucket: 2, count: 3 },
    ]
    const { container } = render(<MiniTimeline buckets={buckets} />)
    expect(container.querySelector('polyline')).toBeInTheDocument()
  })

  it('handles single bucket gracefully', () => {
    render(<MiniTimeline buckets={[{ bucket: 0, count: 42 }]} />)
    expect(screen.getByRole('img')).toBeInTheDocument()
  })
})

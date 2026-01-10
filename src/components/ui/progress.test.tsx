import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Progress } from './progress'

describe('Progress', () => {
  it('renders a progress bar', () => {
    render(<Progress value={50} />)
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toBeInTheDocument()
  })

  it('shows correct percentage width', () => {
    const { container } = render(<Progress value={75} />)
    const innerBar = container.querySelector('[data-progress-inner]')
    expect(innerBar).toHaveStyle({ width: '75%' })
  })

  it('clamps value between 0 and 100', () => {
    const { container, rerender } = render(<Progress value={150} />)
    let innerBar = container.querySelector('[data-progress-inner]')
    expect(innerBar).toHaveStyle({ width: '100%' })

    rerender(<Progress value={-50} />)
    innerBar = container.querySelector('[data-progress-inner]')
    expect(innerBar).toHaveStyle({ width: '0%' })
  })

  it('defaults to 0 when no value provided', () => {
    const { container } = render(<Progress />)
    const innerBar = container.querySelector('[data-progress-inner]')
    expect(innerBar).toHaveStyle({ width: '0%' })
  })
})

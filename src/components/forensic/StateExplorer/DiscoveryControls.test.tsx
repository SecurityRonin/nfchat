import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DiscoveryControls } from './DiscoveryControls'

describe('DiscoveryControls', () => {
  const defaultProps = {
    onDiscover: vi.fn(),
    training: false,
    progress: 0,
    statesDiscovered: 0,
    error: null as string | null,
  }

  it('renders Discover States button', () => {
    render(<DiscoveryControls {...defaultProps} />)
    expect(screen.getByRole('button', { name: /discover states/i })).toBeInTheDocument()
  })

  it('renders state count selector', () => {
    render(<DiscoveryControls {...defaultProps} />)
    expect(screen.getByLabelText(/states/i)).toBeInTheDocument()
  })

  it('calls onDiscover with selected state count when clicked', async () => {
    const user = userEvent.setup()
    const onDiscover = vi.fn()
    render(<DiscoveryControls {...defaultProps} onDiscover={onDiscover} />)

    await user.click(screen.getByRole('button', { name: /discover states/i }))
    expect(onDiscover).toHaveBeenCalledWith(0) // 0 = auto
  })

  it('disables button during training', () => {
    render(<DiscoveryControls {...defaultProps} training={true} progress={50} />)
    expect(screen.getByRole('button', { name: /training/i })).toBeDisabled()
  })

  it('shows progress bar during training', () => {
    render(<DiscoveryControls {...defaultProps} training={true} progress={42} />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '42')
  })

  it('hides progress bar when not training', () => {
    render(<DiscoveryControls {...defaultProps} />)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('shows state count after discovery', () => {
    render(<DiscoveryControls {...defaultProps} statesDiscovered={8} />)
    expect(screen.getByText(/8 states/i)).toBeInTheDocument()
  })

  it('shows error message', () => {
    render(<DiscoveryControls {...defaultProps} error="Training failed" />)
    expect(screen.getByText(/training failed/i)).toBeInTheDocument()
  })
})

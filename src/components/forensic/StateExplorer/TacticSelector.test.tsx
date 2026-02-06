import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TacticSelector } from './TacticSelector'

describe('TacticSelector', () => {
  const defaultProps = {
    stateId: 0,
    suggestedTactic: 'Reconnaissance',
    suggestedConfidence: 0.85,
    assignedTactic: undefined as string | undefined,
    onAssign: vi.fn(),
  }

  it('renders a select trigger', () => {
    render(<TacticSelector {...defaultProps} />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('shows suggested tactic when no assignment', () => {
    render(<TacticSelector {...defaultProps} />)
    expect(screen.getByText(/Reconnaissance/)).toBeInTheDocument()
  })

  it('shows assigned tactic when provided', () => {
    render(<TacticSelector {...defaultProps} assignedTactic="Exfiltration" />)
    expect(screen.getByText(/Exfiltration/)).toBeInTheDocument()
  })

  it('shows confidence dot with green for high confidence', () => {
    render(<TacticSelector {...defaultProps} suggestedConfidence={0.85} />)
    const dot = screen.getByTestId('confidence-dot')
    expect(dot).toBeInTheDocument()
    expect(dot.className).toMatch(/green/)
  })

  it('shows confidence dot with yellow for medium confidence', () => {
    render(<TacticSelector {...defaultProps} suggestedConfidence={0.55} />)
    const dot = screen.getByTestId('confidence-dot')
    expect(dot.className).toMatch(/yellow/)
  })

  it('shows confidence dot with red for low confidence', () => {
    render(<TacticSelector {...defaultProps} suggestedConfidence={0.2} />)
    const dot = screen.getByTestId('confidence-dot')
    expect(dot.className).toMatch(/red/)
  })

  it('calls onAssign when a tactic is selected', async () => {
    const user = userEvent.setup()
    const onAssign = vi.fn()
    render(<TacticSelector {...defaultProps} onAssign={onAssign} />)

    await user.selectOptions(screen.getByRole('combobox'), 'Exfiltration')

    expect(onAssign).toHaveBeenCalledWith(0, 'Exfiltration')
  })
})

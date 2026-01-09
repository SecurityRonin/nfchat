import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AttackBreakdown } from './AttackBreakdown'

describe('AttackBreakdown', () => {
  const mockData = [
    { attack: 'Benign', count: 2237731 },
    { attack: 'Exploits', count: 42748 },
    { attack: 'Fuzzers', count: 33816 },
    { attack: 'Reconnaissance', count: 17074 },
    { attack: 'DoS', count: 5980 },
  ]

  it('renders without crashing', () => {
    render(<AttackBreakdown data={mockData} />)
    expect(screen.getByTestId('attack-breakdown')).toBeInTheDocument()
  })

  it('displays attack type labels', () => {
    render(<AttackBreakdown data={mockData} />)
    expect(screen.getByText('Benign')).toBeInTheDocument()
    expect(screen.getByText('Exploits')).toBeInTheDocument()
    expect(screen.getByText('Fuzzers')).toBeInTheDocument()
  })

  it('shows loading state when loading prop is true', () => {
    render(<AttackBreakdown data={[]} loading={true} />)
    expect(screen.getByTestId('attack-breakdown-loading')).toBeInTheDocument()
  })

  it('shows empty state when data is empty and not loading', () => {
    render(<AttackBreakdown data={[]} loading={false} />)
    expect(screen.getByText(/no data/i)).toBeInTheDocument()
  })

  it('calls onAttackClick when an attack bar is clicked', () => {
    const handleClick = vi.fn()
    render(<AttackBreakdown data={mockData} onAttackClick={handleClick} />)

    // Click on the Exploits bar
    const exploitsBar = screen.getByTestId('attack-bar-Exploits')
    fireEvent.click(exploitsBar)

    expect(handleClick).toHaveBeenCalledWith('Exploits')
  })

  it('formats large numbers with locale string', () => {
    render(<AttackBreakdown data={mockData} />)
    // 2237731 should be formatted as "2,237,731"
    expect(screen.getByText('2,237,731')).toBeInTheDocument()
  })

  it('calculates and displays percentages', () => {
    render(<AttackBreakdown data={mockData} showPercentage={true} />)
    // Benign is ~95.7% of total (2237731 / 2337349)
    expect(screen.getByText(/95\.7%/)).toBeInTheDocument()
  })

  it('limits displayed items based on maxItems prop', () => {
    render(<AttackBreakdown data={mockData} maxItems={3} />)
    expect(screen.getByText('Benign')).toBeInTheDocument()
    expect(screen.getByText('Exploits')).toBeInTheDocument()
    expect(screen.getByText('Fuzzers')).toBeInTheDocument()
    expect(screen.queryByText('Reconnaissance')).not.toBeInTheDocument()
  })

  it('highlights selected attack type', () => {
    render(<AttackBreakdown data={mockData} selectedAttack="Exploits" />)
    const exploitsBar = screen.getByTestId('attack-bar-Exploits')
    expect(exploitsBar).toHaveClass('selected')
  })
})

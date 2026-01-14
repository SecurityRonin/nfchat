import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AttackPopover } from './AttackPopover'

describe('AttackPopover', () => {
  const mockData = [
    { attack: 'DDoS', count: 420 },
    { attack: 'Exploits', count: 280 },
    { attack: 'Benign', count: 150 },
  ]

  it('renders trigger button with top attack info', () => {
    render(<AttackPopover data={mockData} onFilter={vi.fn()} />)
    expect(screen.getByText(/DDoS/)).toBeInTheDocument()
  })

  it('shows popover content when clicked', async () => {
    render(<AttackPopover data={mockData} onFilter={vi.fn()} />)

    // Click trigger
    fireEvent.click(screen.getByRole('button'))

    // Should show heading and all attack types in popover
    expect(screen.getByText('Attack Breakdown')).toBeInTheDocument()
    // Use getAllByText since DDoS appears in trigger and popover
    expect(screen.getAllByText('DDoS').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Exploits')).toBeInTheDocument()
    expect(screen.getByText('Benign')).toBeInTheDocument()
  })

  it('shows counts for each attack type', async () => {
    render(<AttackPopover data={mockData} onFilter={vi.fn()} />)

    fireEvent.click(screen.getByRole('button'))

    expect(screen.getByText('420')).toBeInTheDocument()
    expect(screen.getByText('280')).toBeInTheDocument()
    expect(screen.getByText('150')).toBeInTheDocument()
  })

  it('calls onFilter when "Filter to this" is clicked', async () => {
    const onFilter = vi.fn()
    render(<AttackPopover data={mockData} onFilter={onFilter} />)

    fireEvent.click(screen.getByRole('button'))

    // Click filter button for DDoS
    const filterButtons = screen.getAllByText('Filter')
    fireEvent.click(filterButtons[0])

    expect(onFilter).toHaveBeenCalledWith('Attack', 'DDoS')
  })

  it('shows empty state when no data', () => {
    render(<AttackPopover data={[]} onFilter={vi.fn()} />)
    expect(screen.getByText(/No attacks/i)).toBeInTheDocument()
  })

  it('calculates percentages correctly', async () => {
    render(<AttackPopover data={mockData} onFilter={vi.fn()} />)

    fireEvent.click(screen.getByRole('button'))

    // Total is 850, DDoS is 420 = ~49%
    // 49% appears in trigger and popover
    expect(screen.getAllByText(/49%/).length).toBeGreaterThanOrEqual(1)
  })
})

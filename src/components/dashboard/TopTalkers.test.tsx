import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TopTalkers } from './TopTalkers'

describe('TopTalkers', () => {
  const mockData = [
    { ip: '59.166.0.2', value: 1500000 },
    { ip: '149.171.126.3', value: 1200000 },
    { ip: '59.166.0.4', value: 800000 },
    { ip: '149.171.126.6', value: 500000 },
    { ip: '59.166.0.8', value: 300000 },
  ]

  it('renders without crashing', () => {
    render(<TopTalkers data={mockData} />)
    expect(screen.getByTestId('top-talkers')).toBeInTheDocument()
  })

  it('displays IP addresses', () => {
    render(<TopTalkers data={mockData} />)
    expect(screen.getByText('59.166.0.2')).toBeInTheDocument()
    expect(screen.getByText('149.171.126.3')).toBeInTheDocument()
  })

  it('shows loading state when loading prop is true', () => {
    render(<TopTalkers data={[]} loading={true} />)
    expect(screen.getByTestId('top-talkers-loading')).toBeInTheDocument()
  })

  it('shows empty state when data is empty', () => {
    render(<TopTalkers data={[]} loading={false} />)
    expect(screen.getByText(/no data/i)).toBeInTheDocument()
  })

  it('calls onIpClick when an IP bar is clicked', () => {
    const handleClick = vi.fn()
    render(<TopTalkers data={mockData} onIpClick={handleClick} />)

    const ipBar = screen.getByTestId('ip-bar-59.166.0.2')
    fireEvent.click(ipBar)

    expect(handleClick).toHaveBeenCalledWith('59.166.0.2')
  })

  it('formats large numbers with abbreviations', () => {
    render(<TopTalkers data={mockData} formatValue="abbreviated" />)
    // 1500000 should be "1.5M" or "1,500,000"
    expect(screen.getByText(/1\.5M|1,500,000/)).toBeInTheDocument()
  })

  it('displays correct title based on direction prop', () => {
    const { rerender } = render(<TopTalkers data={mockData} direction="src" />)
    expect(screen.getByText(/source/i)).toBeInTheDocument()

    rerender(<TopTalkers data={mockData} direction="dst" />)
    expect(screen.getByText(/destination/i)).toBeInTheDocument()
  })

  it('displays correct metric label', () => {
    const { rerender } = render(<TopTalkers data={mockData} metric="bytes" />)
    expect(screen.getByText(/bytes/i)).toBeInTheDocument()

    rerender(<TopTalkers data={mockData} metric="flows" />)
    expect(screen.getByText(/flows/i)).toBeInTheDocument()
  })

  it('limits displayed items based on maxItems prop', () => {
    render(<TopTalkers data={mockData} maxItems={3} />)
    expect(screen.getByText('59.166.0.2')).toBeInTheDocument()
    expect(screen.getByText('149.171.126.3')).toBeInTheDocument()
    expect(screen.getByText('59.166.0.4')).toBeInTheDocument()
    expect(screen.queryByText('149.171.126.6')).not.toBeInTheDocument()
  })

  it('highlights selected IP', () => {
    render(<TopTalkers data={mockData} selectedIp="59.166.0.4" />)
    const selectedBar = screen.getByTestId('ip-bar-59.166.0.4')
    expect(selectedBar).toHaveClass('selected')
  })
})

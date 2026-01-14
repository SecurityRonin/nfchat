import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TopTalkersPopover } from './TopTalkersPopover'

describe('TopTalkersPopover', () => {
  const mockSrcData = [
    { ip: '192.168.1.100', value: 5000 },
    { ip: '10.0.0.50', value: 3000 },
    { ip: '172.16.0.1', value: 1500 },
  ]

  const mockDstData = [
    { ip: '8.8.8.8', value: 8000 },
    { ip: '1.1.1.1', value: 4000 },
  ]

  it('renders trigger button with top source IP', () => {
    render(
      <TopTalkersPopover
        topSrcIPs={mockSrcData}
        topDstIPs={mockDstData}
        onFilter={vi.fn()}
      />
    )
    expect(screen.getByText(/192\.168\.1\.100/)).toBeInTheDocument()
  })

  it('shows popover content with tabs when clicked', async () => {
    const user = userEvent.setup()
    render(
      <TopTalkersPopover
        topSrcIPs={mockSrcData}
        topDstIPs={mockDstData}
        onFilter={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button'))

    // Should show tabs for source and destination
    expect(screen.getByText('Top Talkers')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Source/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Dest/i })).toBeInTheDocument()
  })

  it('shows source IPs by default', async () => {
    const user = userEvent.setup()
    render(
      <TopTalkersPopover
        topSrcIPs={mockSrcData}
        topDstIPs={mockDstData}
        onFilter={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button'))

    // Source IPs should be visible (may appear twice - in trigger and popover)
    expect(screen.getAllByText('192.168.1.100').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('10.0.0.50')).toBeInTheDocument()
  })

  it('switches to destination IPs when tab clicked', async () => {
    const user = userEvent.setup()
    render(
      <TopTalkersPopover
        topSrcIPs={mockSrcData}
        topDstIPs={mockDstData}
        onFilter={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button'))
    await user.click(screen.getByRole('tab', { name: /Dest/i }))

    // Destination IPs should be visible
    expect(screen.getByText('8.8.8.8')).toBeInTheDocument()
    expect(screen.getByText('1.1.1.1')).toBeInTheDocument()
  })

  it('calls onFilter with correct column for source IP', async () => {
    const user = userEvent.setup()
    const onFilter = vi.fn()
    render(
      <TopTalkersPopover
        topSrcIPs={mockSrcData}
        topDstIPs={mockDstData}
        onFilter={onFilter}
      />
    )

    await user.click(screen.getByRole('button'))

    const filterButtons = screen.getAllByText('Filter')
    await user.click(filterButtons[0])

    expect(onFilter).toHaveBeenCalledWith('IPV4_SRC_ADDR', '192.168.1.100')
  })

  it('calls onFilter with correct column for destination IP', async () => {
    const user = userEvent.setup()
    const onFilter = vi.fn()
    render(
      <TopTalkersPopover
        topSrcIPs={mockSrcData}
        topDstIPs={mockDstData}
        onFilter={onFilter}
      />
    )

    await user.click(screen.getByRole('button'))
    await user.click(screen.getByRole('tab', { name: /Dest/i }))

    const filterButtons = screen.getAllByText('Filter')
    await user.click(filterButtons[0])

    expect(onFilter).toHaveBeenCalledWith('IPV4_DST_ADDR', '8.8.8.8')
  })

  it('shows empty state when no data', () => {
    render(
      <TopTalkersPopover
        topSrcIPs={[]}
        topDstIPs={[]}
        onFilter={vi.fn()}
      />
    )
    expect(screen.getByText(/No IP data/i)).toBeInTheDocument()
  })

  it('formats large byte values with K/M suffix', async () => {
    const user = userEvent.setup()
    const largeData = [{ ip: '192.168.1.1', value: 1500000 }]
    render(
      <TopTalkersPopover
        topSrcIPs={largeData}
        topDstIPs={[]}
        onFilter={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button'))

    // 1500000 should show as 1.5M
    expect(screen.getByText(/1\.5M/)).toBeInTheDocument()
  })
})

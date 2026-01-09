import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FlowTable } from './FlowTable'
import type { FlowRecord } from '@/lib/schema'

describe('FlowTable', () => {
  const mockData: Partial<FlowRecord>[] = [
    {
      FLOW_START_MILLISECONDS: 1424242193040,
      IPV4_SRC_ADDR: '59.166.0.2',
      L4_SRC_PORT: 4894,
      IPV4_DST_ADDR: '149.171.126.3',
      L4_DST_PORT: 53,
      PROTOCOL: 17,
      L7_PROTO: 5,
      IN_BYTES: 146,
      OUT_BYTES: 178,
      Attack: 'Benign',
    },
    {
      FLOW_START_MILLISECONDS: 1424242192744,
      IPV4_SRC_ADDR: '59.166.0.4',
      L4_SRC_PORT: 52671,
      IPV4_DST_ADDR: '149.171.126.6',
      L4_DST_PORT: 31992,
      PROTOCOL: 6,
      L7_PROTO: 11,
      IN_BYTES: 4704,
      OUT_BYTES: 2976,
      Attack: 'Exploits',
    },
  ]

  it('renders without crashing', () => {
    render(<FlowTable data={mockData} />)
    expect(screen.getByTestId('flow-table')).toBeInTheDocument()
  })

  it('displays column headers', () => {
    render(<FlowTable data={mockData} />)
    expect(screen.getByText('Src IP')).toBeInTheDocument()
    expect(screen.getByText('Dst IP')).toBeInTheDocument()
    expect(screen.getByText('Src Port')).toBeInTheDocument()
    expect(screen.getByText('Dst Port')).toBeInTheDocument()
    expect(screen.getByText('Attack')).toBeInTheDocument()
  })

  it('displays flow data in rows', () => {
    render(<FlowTable data={mockData} />)
    expect(screen.getByText('59.166.0.2')).toBeInTheDocument()
    expect(screen.getByText('149.171.126.3')).toBeInTheDocument()
    expect(screen.getByText('Benign')).toBeInTheDocument()
  })

  it('shows loading state when loading prop is true', () => {
    render(<FlowTable data={[]} loading={true} />)
    expect(screen.getByTestId('flow-table-loading')).toBeInTheDocument()
  })

  it('shows empty state when data is empty', () => {
    render(<FlowTable data={[]} loading={false} />)
    expect(screen.getByText(/no flows/i)).toBeInTheDocument()
  })

  it('calls onRowClick when a row is clicked', () => {
    const handleClick = vi.fn()
    render(<FlowTable data={mockData} onRowClick={handleClick} />)

    const row = screen.getByText('59.166.0.2').closest('tr')
    if (row) fireEvent.click(row)

    expect(handleClick).toHaveBeenCalledWith(expect.objectContaining({
      IPV4_SRC_ADDR: '59.166.0.2',
    }))
  })

  it('formats protocol numbers as names', () => {
    render(<FlowTable data={mockData} />)
    // Protocol 17 = UDP, Protocol 6 = TCP
    expect(screen.getByText('UDP')).toBeInTheDocument()
    expect(screen.getByText('TCP')).toBeInTheDocument()
  })

  it('highlights selected row', () => {
    render(<FlowTable data={mockData} selectedIndex={0} />)
    const firstRow = screen.getByText('59.166.0.2').closest('tr')
    expect(firstRow).toHaveClass('selected')
  })

  it('displays flow count', () => {
    render(<FlowTable data={mockData} totalCount={2365425} />)
    expect(screen.getByText(/2,365,425/)).toBeInTheDocument()
  })
})

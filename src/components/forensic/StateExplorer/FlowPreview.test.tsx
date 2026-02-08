import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FlowPreview } from './FlowPreview'

const sampleFlows = [
  {
    IPV4_SRC_ADDR: '10.0.0.1',
    IPV4_DST_ADDR: '192.168.1.1',
    PROTOCOL: 6,
    L4_DST_PORT: 443,
    IN_BYTES: 1500,
    OUT_BYTES: 800,
    FLOW_DURATION_MILLISECONDS: 5000,
  },
  {
    IPV4_SRC_ADDR: '10.0.0.2',
    IPV4_DST_ADDR: '192.168.1.2',
    PROTOCOL: 17,
    L4_DST_PORT: 53,
    IN_BYTES: 200,
    OUT_BYTES: 400,
    FLOW_DURATION_MILLISECONDS: 100,
  },
]

describe('FlowPreview', () => {
  it('renders expand button', () => {
    render(<FlowPreview flows={sampleFlows} totalFlowCount={1500} loading={false} onExpand={vi.fn()} expanded={false} />)
    expect(screen.getByRole('button', { name: /sample flows/i })).toBeInTheDocument()
  })

  it('does not show table when collapsed', () => {
    render(<FlowPreview flows={sampleFlows} totalFlowCount={1500} loading={false} onExpand={vi.fn()} expanded={false} />)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows table when expanded', () => {
    render(<FlowPreview flows={sampleFlows} totalFlowCount={1500} loading={false} onExpand={vi.fn()} expanded={true} />)
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('displays flow data in table rows', () => {
    render(<FlowPreview flows={sampleFlows} totalFlowCount={1500} loading={false} onExpand={vi.fn()} expanded={true} />)
    expect(screen.getByText('10.0.0.1')).toBeInTheDocument()
    expect(screen.getByText('192.168.1.1')).toBeInTheDocument()
    expect(screen.getByText('443')).toBeInTheDocument()
  })

  it('calls onExpand when button is clicked', async () => {
    const user = userEvent.setup()
    const onExpand = vi.fn()
    render(<FlowPreview flows={sampleFlows} totalFlowCount={1500} loading={false} onExpand={onExpand} expanded={false} />)

    await user.click(screen.getByRole('button', { name: /sample flows/i }))
    expect(onExpand).toHaveBeenCalled()
  })

  it('shows loading state', () => {
    render(<FlowPreview flows={[]} totalFlowCount={0} loading={true} onExpand={vi.fn()} expanded={true} />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows empty state when no flows', () => {
    render(<FlowPreview flows={[]} totalFlowCount={0} loading={false} onExpand={vi.fn()} expanded={true} />)
    expect(screen.getByText(/no sample flows/i)).toBeInTheDocument()
  })

  it('shows totalFlowCount when collapsed (not flows.length)', () => {
    render(<FlowPreview flows={[]} totalFlowCount={12345} loading={false} onExpand={vi.fn()} expanded={false} />)
    expect(screen.getByRole('button')).toHaveTextContent('12,345')
  })

  it('shows loaded flows.length when expanded', () => {
    render(<FlowPreview flows={sampleFlows} totalFlowCount={12345} loading={false} onExpand={vi.fn()} expanded={true} />)
    expect(screen.getByRole('button')).toHaveTextContent('2')
  })
})

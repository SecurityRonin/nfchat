import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Chat } from './Chat'

describe('Chat', () => {
  const mockOnSend = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<Chat messages={[]} onSend={mockOnSend} />)
    expect(screen.getByTestId('chat-panel')).toBeInTheDocument()
  })

  it('displays chat messages', () => {
    const messages = [
      { id: '1', role: 'user' as const, content: 'Hello', timestamp: new Date() },
      { id: '2', role: 'assistant' as const, content: 'Hi there!', timestamp: new Date() },
    ]
    render(<Chat messages={messages} onSend={mockOnSend} />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('Hi there!')).toBeInTheDocument()
  })

  it('has an input field for typing messages', () => {
    render(<Chat messages={[]} onSend={mockOnSend} />)
    expect(screen.getByPlaceholderText(/ask about/i)).toBeInTheDocument()
  })

  it('has a send button', () => {
    render(<Chat messages={[]} onSend={mockOnSend} />)
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  it('calls onSend when send button is clicked', async () => {
    const user = userEvent.setup()
    render(<Chat messages={[]} onSend={mockOnSend} />)

    const input = screen.getByPlaceholderText(/ask about/i)
    await user.type(input, 'Show me all attacks')
    await user.click(screen.getByRole('button', { name: /send/i }))

    expect(mockOnSend).toHaveBeenCalledWith('Show me all attacks')
  })

  it('calls onSend when Enter is pressed', async () => {
    const user = userEvent.setup()
    render(<Chat messages={[]} onSend={mockOnSend} />)

    const input = screen.getByPlaceholderText(/ask about/i)
    await user.type(input, 'Top talkers{enter}')

    expect(mockOnSend).toHaveBeenCalledWith('Top talkers')
  })

  it('clears input after sending', async () => {
    const user = userEvent.setup()
    render(<Chat messages={[]} onSend={mockOnSend} />)

    const input = screen.getByPlaceholderText(/ask about/i) as HTMLInputElement
    await user.type(input, 'Test message')
    await user.click(screen.getByRole('button', { name: /send/i }))

    expect(input.value).toBe('')
  })

  it('shows loading state when isLoading is true', () => {
    render(<Chat messages={[]} onSend={mockOnSend} isLoading={true} />)
    expect(screen.getByTestId('chat-loading')).toBeInTheDocument()
  })

  it('disables input when loading', () => {
    render(<Chat messages={[]} onSend={mockOnSend} isLoading={true} />)
    const input = screen.getByPlaceholderText(/ask about/i)
    expect(input).toBeDisabled()
  })

  it('shows close button when onClose is provided', () => {
    render(<Chat messages={[]} onSend={mockOnSend} onClose={mockOnClose} />)
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    render(<Chat messages={[]} onSend={mockOnSend} onClose={mockOnClose} />)

    await user.click(screen.getByRole('button', { name: /close/i }))
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('displays SQL queries in messages when present', () => {
    const messages = [
      {
        id: '1',
        role: 'assistant' as const,
        content: 'Found 100 malicious flows',
        sql: "SELECT * FROM flows WHERE Attack != 'Benign'",
        timestamp: new Date(),
      },
    ]
    render(<Chat messages={messages} onSend={mockOnSend} />)
    expect(screen.getByText(/SELECT \* FROM flows/)).toBeInTheDocument()
  })

  it('shows suggested pivots when present', () => {
    const messages = [
      {
        id: '1',
        role: 'assistant' as const,
        content: 'Analysis complete',
        suggestedPivots: ['Show top attackers', 'Filter by time'],
        timestamp: new Date(),
      },
    ]
    render(<Chat messages={messages} onSend={mockOnSend} />)
    expect(screen.getByText('Show top attackers')).toBeInTheDocument()
    expect(screen.getByText('Filter by time')).toBeInTheDocument()
  })
})

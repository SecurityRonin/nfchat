/**
 * Consent Modal Tests (TDD)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConsentModal } from './ConsentModal'

describe('ConsentModal', () => {
  const mockOnAccept = vi.fn()
  const mockOnDecline = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Clear localStorage
    localStorage.clear()
  })

  it('renders when no consent is stored', () => {
    render(<ConsentModal onAccept={mockOnAccept} onDecline={mockOnDecline} />)

    expect(screen.getByText(/Research Disclosure/i)).toBeInTheDocument()
    expect(screen.getByText(/questions and query results will be retained/i)).toBeInTheDocument()
  })

  it('does not render when consent is already given', () => {
    localStorage.setItem('nfchat_consent', JSON.stringify({
      given: true,
      timestamp: Date.now(),
    }))

    render(<ConsentModal onAccept={mockOnAccept} onDecline={mockOnDecline} />)

    expect(screen.queryByText(/Research Disclosure/i)).not.toBeInTheDocument()
  })

  it('re-prompts when consent is older than 90 days', () => {
    const ninetyOneDaysAgo = Date.now() - (91 * 24 * 60 * 60 * 1000)
    localStorage.setItem('nfchat_consent', JSON.stringify({
      given: true,
      timestamp: ninetyOneDaysAgo,
    }))

    render(<ConsentModal onAccept={mockOnAccept} onDecline={mockOnDecline} />)

    expect(screen.getByText(/Research Disclosure/i)).toBeInTheDocument()
  })

  it('calls onAccept when user accepts', () => {
    render(<ConsentModal onAccept={mockOnAccept} onDecline={mockOnDecline} />)

    // Must check the checkbox first
    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)

    const acceptButton = screen.getByRole('button', { name: /Accept & Continue/i })
    fireEvent.click(acceptButton)

    expect(mockOnAccept).toHaveBeenCalled()
  })

  it('requires checkbox before accepting', () => {
    render(<ConsentModal onAccept={mockOnAccept} onDecline={mockOnDecline} />)

    const acceptButton = screen.getByRole('button', { name: /Accept & Continue/i })
    expect(acceptButton).toBeDisabled()

    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)

    expect(acceptButton).not.toBeDisabled()
  })

  it('stores consent in localStorage on accept', () => {
    render(<ConsentModal onAccept={mockOnAccept} onDecline={mockOnDecline} />)

    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)

    const acceptButton = screen.getByRole('button', { name: /Accept & Continue/i })
    fireEvent.click(acceptButton)

    const stored = JSON.parse(localStorage.getItem('nfchat_consent') || '{}')
    expect(stored.given).toBe(true)
    expect(stored.timestamp).toBeDefined()
  })

  it('calls onDecline when user cancels', () => {
    render(<ConsentModal onAccept={mockOnAccept} onDecline={mockOnDecline} />)

    const cancelButton = screen.getByRole('button', { name: /Cancel/i })
    fireEvent.click(cancelButton)

    expect(mockOnDecline).toHaveBeenCalled()
  })
})

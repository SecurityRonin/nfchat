import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MultiSelectFilter } from './MultiSelectFilter'

const mockOptions = [
  { value: 'Benign', label: 'Benign', color: '#22c55e' },
  { value: 'Exploits', label: 'Exploits', color: '#ef4444' },
  { value: 'DoS', label: 'DoS', color: '#a855f7' },
]

describe('MultiSelectFilter', () => {
  it('renders trigger button', () => {
    render(
      <MultiSelectFilter
        options={mockOptions}
        selected={[]}
        onChange={() => {}}
        placeholder="Filter..."
      />
    )
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('shows placeholder when nothing selected', () => {
    render(
      <MultiSelectFilter
        options={mockOptions}
        selected={[]}
        onChange={() => {}}
        placeholder="Filter..."
      />
    )
    expect(screen.getByText('Filter...')).toBeInTheDocument()
  })

  it('shows count when items selected', () => {
    render(
      <MultiSelectFilter
        options={mockOptions}
        selected={['Benign', 'DoS']}
        onChange={() => {}}
        placeholder="Filter..."
      />
    )
    expect(screen.getByText('2 selected')).toBeInTheDocument()
  })

  it('opens popover on click', () => {
    render(
      <MultiSelectFilter
        options={mockOptions}
        selected={[]}
        onChange={() => {}}
        placeholder="Filter..."
      />
    )
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Benign')).toBeInTheDocument()
    expect(screen.getByText('Exploits')).toBeInTheDocument()
    expect(screen.getByText('DoS')).toBeInTheDocument()
  })

  it('calls onChange when option clicked', () => {
    const onChange = vi.fn()
    render(
      <MultiSelectFilter
        options={mockOptions}
        selected={[]}
        onChange={onChange}
        placeholder="Filter..."
      />
    )
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Benign'))
    expect(onChange).toHaveBeenCalledWith(['Benign'])
  })

  it('removes item when already selected', () => {
    const onChange = vi.fn()
    render(
      <MultiSelectFilter
        options={mockOptions}
        selected={['Benign', 'DoS']}
        onChange={onChange}
        placeholder="Filter..."
      />
    )
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Benign'))
    expect(onChange).toHaveBeenCalledWith(['DoS'])
  })

  it('has clear all button when items selected', () => {
    const onChange = vi.fn()
    render(
      <MultiSelectFilter
        options={mockOptions}
        selected={['Benign']}
        onChange={onChange}
        placeholder="Filter..."
      />
    )
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Clear all'))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('has select all button', () => {
    const onChange = vi.fn()
    render(
      <MultiSelectFilter
        options={mockOptions}
        selected={[]}
        onChange={onChange}
        placeholder="Filter..."
      />
    )
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Select all'))
    expect(onChange).toHaveBeenCalledWith(['Benign', 'Exploits', 'DoS'])
  })
})

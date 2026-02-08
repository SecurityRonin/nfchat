import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StateGridControls } from './StateGridControls'

describe('StateGridControls', () => {
  it('renders sort dropdown with default value', () => {
    render(
      <StateGridControls
        sortBy="flowCount"
        sortDirection="desc"
        minFlowCount={0}
        tacticFilter="all"
        onSortByChange={vi.fn()}
        onSortDirectionToggle={vi.fn()}
        onMinFlowCountChange={vi.fn()}
        onTacticFilterChange={vi.fn()}
      />
    )

    const sortSelect = screen.getByDisplayValue(/flow count/i)
    expect(sortSelect).toBeInTheDocument()
    expect(sortSelect.tagName).toBe('SELECT')
  })

  it('renders all sort options', () => {
    render(
      <StateGridControls
        sortBy="flowCount"
        sortDirection="desc"
        minFlowCount={0}
        tacticFilter="all"
        onSortByChange={vi.fn()}
        onSortDirectionToggle={vi.fn()}
        onMinFlowCountChange={vi.fn()}
        onTacticFilterChange={vi.fn()}
      />
    )

    expect(screen.getByRole('option', { name: /flow count/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /avg bytes/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /avg duration/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /pkts\/sec/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /bytes ratio/i })).toBeInTheDocument()
  })

  it('calls onSortByChange when sort option is selected', async () => {
    const user = userEvent.setup()
    const onSortByChange = vi.fn()

    render(
      <StateGridControls
        sortBy="flowCount"
        sortDirection="desc"
        minFlowCount={0}
        tacticFilter="all"
        onSortByChange={onSortByChange}
        onSortDirectionToggle={vi.fn()}
        onMinFlowCountChange={vi.fn()}
        onTacticFilterChange={vi.fn()}
      />
    )

    const sortSelect = screen.getByDisplayValue(/flow count/i)
    await user.selectOptions(sortSelect, 'avgBytes')

    expect(onSortByChange).toHaveBeenCalledWith('avgBytes')
  })

  it('renders sort direction toggle button', () => {
    render(
      <StateGridControls
        sortBy="flowCount"
        sortDirection="desc"
        minFlowCount={0}
        tacticFilter="all"
        onSortByChange={vi.fn()}
        onSortDirectionToggle={vi.fn()}
        onMinFlowCountChange={vi.fn()}
        onTacticFilterChange={vi.fn()}
      />
    )

    const toggleBtn = screen.getByRole('button', { name: /desc/i })
    expect(toggleBtn).toBeInTheDocument()
  })

  it('calls onSortDirectionToggle when direction button is clicked', async () => {
    const user = userEvent.setup()
    const onSortDirectionToggle = vi.fn()

    render(
      <StateGridControls
        sortBy="flowCount"
        sortDirection="desc"
        minFlowCount={0}
        tacticFilter="all"
        onSortByChange={vi.fn()}
        onSortDirectionToggle={onSortDirectionToggle}
        onMinFlowCountChange={vi.fn()}
        onTacticFilterChange={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: /desc/i }))
    expect(onSortDirectionToggle).toHaveBeenCalled()
  })

  it('renders min flow count input with current value', () => {
    render(
      <StateGridControls
        sortBy="flowCount"
        sortDirection="desc"
        minFlowCount={100}
        tacticFilter="all"
        onSortByChange={vi.fn()}
        onSortDirectionToggle={vi.fn()}
        onMinFlowCountChange={vi.fn()}
        onTacticFilterChange={vi.fn()}
      />
    )

    const input = screen.getByRole('spinbutton', { name: /min flows/i })
    expect(input).toHaveValue(100)
  })

  it('calls onMinFlowCountChange when min flow count is changed', () => {
    const onMinFlowCountChange = vi.fn()

    render(
      <StateGridControls
        sortBy="flowCount"
        sortDirection="desc"
        minFlowCount={100}
        tacticFilter="all"
        onSortByChange={vi.fn()}
        onSortDirectionToggle={vi.fn()}
        onMinFlowCountChange={onMinFlowCountChange}
        onTacticFilterChange={vi.fn()}
      />
    )

    const input = screen.getByRole('spinbutton', { name: /min flows/i }) as HTMLInputElement
    // Use fireEvent to trigger onChange with a new value
    fireEvent.change(input, { target: { value: '250' } })

    // Verify the callback was called with the numeric value
    expect(onMinFlowCountChange).toHaveBeenCalledWith(250)
  })

  it('renders tactic filter dropdown', () => {
    render(
      <StateGridControls
        sortBy="flowCount"
        sortDirection="desc"
        minFlowCount={0}
        tacticFilter="all"
        onSortByChange={vi.fn()}
        onSortDirectionToggle={vi.fn()}
        onMinFlowCountChange={vi.fn()}
        onTacticFilterChange={vi.fn()}
      />
    )

    const tacticSelect = screen.getByDisplayValue(/all states/i)
    expect(tacticSelect).toBeInTheDocument()
  })

  it('renders tactic filter options', () => {
    render(
      <StateGridControls
        sortBy="flowCount"
        sortDirection="desc"
        minFlowCount={0}
        tacticFilter="all"
        onSortByChange={vi.fn()}
        onSortDirectionToggle={vi.fn()}
        onMinFlowCountChange={vi.fn()}
        onTacticFilterChange={vi.fn()}
      />
    )

    expect(screen.getByRole('option', { name: /all states/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /^assigned only$/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /^unassigned only$/i })).toBeInTheDocument()
  })

  it('calls onTacticFilterChange when tactic filter is changed', async () => {
    const user = userEvent.setup()
    const onTacticFilterChange = vi.fn()

    render(
      <StateGridControls
        sortBy="flowCount"
        sortDirection="desc"
        minFlowCount={0}
        tacticFilter="all"
        onSortByChange={vi.fn()}
        onSortDirectionToggle={vi.fn()}
        onMinFlowCountChange={vi.fn()}
        onTacticFilterChange={onTacticFilterChange}
      />
    )

    const tacticSelect = screen.getByDisplayValue(/all states/i)
    await user.selectOptions(tacticSelect, 'assigned')

    expect(onTacticFilterChange).toHaveBeenCalledWith('assigned')
  })

  it('shows ascending arrow when sortDirection is asc', () => {
    render(
      <StateGridControls
        sortBy="flowCount"
        sortDirection="asc"
        minFlowCount={0}
        tacticFilter="all"
        onSortByChange={vi.fn()}
        onSortDirectionToggle={vi.fn()}
        onMinFlowCountChange={vi.fn()}
        onTacticFilterChange={vi.fn()}
      />
    )

    const toggleBtn = screen.getByRole('button', { name: /asc/i })
    expect(toggleBtn).toBeInTheDocument()
    expect(toggleBtn.textContent).toContain('↑')
  })

  it('all sort option values map correctly', () => {
    render(
      <StateGridControls
        sortBy="flowCount"
        sortDirection="desc"
        minFlowCount={0}
        tacticFilter="all"
        onSortByChange={vi.fn()}
        onSortDirectionToggle={vi.fn()}
        onMinFlowCountChange={vi.fn()}
        onTacticFilterChange={vi.fn()}
      />
    )

    const sortSelect = screen.getByDisplayValue(/flow count/i) as HTMLSelectElement
    const options = Array.from(sortSelect.options)

    expect(options.find((opt) => opt.value === 'flowCount')).toBeDefined()
    expect(options.find((opt) => opt.value === 'avgBytes')).toBeDefined()
    expect(options.find((opt) => opt.value === 'avgDuration')).toBeDefined()
    expect(options.find((opt) => opt.value === 'pktsPerSec')).toBeDefined()
    expect(options.find((opt) => opt.value === 'bytesRatio')).toBeDefined()
  })
})

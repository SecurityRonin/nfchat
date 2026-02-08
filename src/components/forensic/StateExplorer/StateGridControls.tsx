import { memo } from 'react'

export type SortBy = 'flowCount' | 'avgBytes' | 'avgDuration' | 'pktsPerSec' | 'bytesRatio'
export type SortDirection = 'asc' | 'desc'
export type TacticFilter = 'all' | 'assigned' | 'unassigned'

interface StateGridControlsProps {
  sortBy: SortBy
  sortDirection: SortDirection
  minFlowCount: number
  tacticFilter: TacticFilter
  onSortByChange: (sortBy: SortBy) => void
  onSortDirectionToggle: () => void
  onMinFlowCountChange: (minFlowCount: number) => void
  onTacticFilterChange: (filter: TacticFilter) => void
}

export const StateGridControls = memo(function StateGridControls({
  sortBy,
  sortDirection,
  minFlowCount,
  tacticFilter,
  onSortByChange,
  onSortDirectionToggle,
  onMinFlowCountChange,
  onTacticFilterChange,
}: StateGridControlsProps) {
  return (
    <div className="px-4 py-3 border-b border-border bg-card">
      <div className="flex flex-wrap items-center gap-4">
        {/* Sort By */}
        <div className="flex items-center gap-2">
          <label htmlFor="sort-by" className="text-sm font-medium">
            Sort:
          </label>
          <select
            id="sort-by"
            className="px-2 py-1 text-sm border border-border rounded bg-background"
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as SortBy)}
          >
            <option value="flowCount">Flow Count</option>
            <option value="avgBytes">Avg Bytes (In+Out)</option>
            <option value="avgDuration">Avg Duration</option>
            <option value="pktsPerSec">Pkts/Sec</option>
            <option value="bytesRatio">Bytes Ratio</option>
          </select>
        </div>

        {/* Sort Direction */}
        <button
          className="px-3 py-1 text-sm font-medium border border-border rounded hover:bg-accent"
          onClick={onSortDirectionToggle}
          title="Toggle sort direction"
        >
          {sortDirection === 'desc' ? '↓ Desc' : '↑ Asc'}
        </button>

        {/* Min Flow Count */}
        <div className="flex items-center gap-2">
          <label htmlFor="min-flows" className="text-sm font-medium">
            Min Flows:
          </label>
          <input
            id="min-flows"
            type="number"
            className="w-24 px-2 py-1 text-sm border border-border rounded bg-background"
            min="0"
            value={minFlowCount}
            onChange={(e) => onMinFlowCountChange(Number(e.target.value))}
            aria-label="Min Flows"
          />
        </div>

        {/* Tactic Filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="tactic-filter" className="text-sm font-medium">
            Filter:
          </label>
          <select
            id="tactic-filter"
            className="px-2 py-1 text-sm border border-border rounded bg-background"
            value={tacticFilter}
            onChange={(e) => onTacticFilterChange(e.target.value as TacticFilter)}
          >
            <option value="all">All States</option>
            <option value="assigned">Assigned Only</option>
            <option value="unassigned">Unassigned Only</option>
          </select>
        </div>
      </div>
    </div>
  )
})

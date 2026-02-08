import { useCallback, useMemo, useState } from 'react'
import type { StateProfile } from '@/lib/store/types'

export type SortBy = 'flowCount' | 'avgBytes' | 'avgDuration' | 'pktsPerSec' | 'bytesRatio'
export type SortDirection = 'asc' | 'desc'
export type TacticFilter = 'all' | 'assigned' | 'unassigned'

interface UseStateGridResult {
  // Sort
  sortBy: SortBy
  sortDirection: SortDirection
  setSortBy: (sortBy: SortBy) => void
  toggleSortDirection: () => void
  // Filter
  minFlowCount: number
  tacticFilter: TacticFilter
  setMinFlowCount: (count: number) => void
  setTacticFilter: (filter: TacticFilter) => void
  // Comparison
  comparisonStates: [number, number] | null
  toggleCompare: (stateId: number) => void
  clearComparison: () => void
  // Computed
  filteredAndSortedStates: StateProfile[]
}

export function useStateGrid(
  hmmStates: StateProfile[],
  tacticAssignments: Record<number, string>
): UseStateGridResult {
  const [sortBy, setSortBy] = useState<SortBy>('flowCount')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [minFlowCount, setMinFlowCount] = useState(0)
  const [tacticFilter, setTacticFilter] = useState<TacticFilter>('all')
  const [comparisonStates, setComparisonStates] = useState<[number, number] | null>(null)

  const toggleSortDirection = useCallback(() => {
    setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'))
  }, [])

  const toggleCompare = useCallback((stateId: number) => {
    setComparisonStates((prev) => {
      if (!prev) {
        return [stateId, -1] as [number, number]
      }
      if (prev[0] === stateId) {
        return null
      }
      if (prev[1] === stateId) {
        return [prev[0], -1] as [number, number]
      }
      if (prev[1] === -1) {
        return [prev[0], stateId] as [number, number]
      }
      return [prev[0], stateId] as [number, number]
    })
  }, [])

  const clearComparison = useCallback(() => {
    setComparisonStates(null)
  }, [])

  const filteredAndSortedStates = useMemo(() => {
    let filtered = hmmStates

    if (minFlowCount > 0) {
      filtered = filtered.filter((s) => s.flowCount >= minFlowCount)
    }

    if (tacticFilter === 'assigned') {
      filtered = filtered.filter((s) => tacticAssignments[s.stateId] !== undefined)
    } else if (tacticFilter === 'unassigned') {
      filtered = filtered.filter((s) => tacticAssignments[s.stateId] === undefined)
    }

    const sorted = [...filtered].sort((a, b) => {
      let aVal: number, bVal: number

      switch (sortBy) {
        case 'flowCount':
          aVal = a.flowCount
          bVal = b.flowCount
          break
        case 'avgBytes':
          aVal = a.avgInBytes + a.avgOutBytes
          bVal = b.avgInBytes + b.avgOutBytes
          break
        case 'avgDuration':
          aVal = a.avgDurationMs
          bVal = b.avgDurationMs
          break
        case 'pktsPerSec':
          aVal = a.avgPktsPerSec
          bVal = b.avgPktsPerSec
          break
        case 'bytesRatio':
          aVal = a.bytesRatio
          bVal = b.bytesRatio
          break
      }

      return sortDirection === 'desc' ? bVal - aVal : aVal - bVal
    })

    return sorted
  }, [hmmStates, tacticAssignments, minFlowCount, tacticFilter, sortBy, sortDirection])

  return {
    sortBy,
    sortDirection,
    setSortBy,
    toggleSortDirection,
    minFlowCount,
    tacticFilter,
    setMinFlowCount,
    setTacticFilter,
    comparisonStates,
    toggleCompare,
    clearComparison,
    filteredAndSortedStates,
  }
}

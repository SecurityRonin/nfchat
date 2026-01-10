import { useState, useEffect, useCallback } from 'react'
import {
  loadParquetData,
  getTimelineData,
  getAttackDistribution,
  getTopTalkers,
  getFlows,
  getFlowCount,
} from '@/lib/duckdb'
import { useStore } from '@/lib/store'
import type { ProgressEvent, LogEntry } from '@/lib/progress'

interface UseNetflowDataResult {
  loading: boolean
  error: string | null
  totalRows: number
  progress: ProgressEvent
  logs: LogEntry[]
  refresh: (whereClause?: string) => Promise<void>
}

const initialProgress: ProgressEvent = {
  stage: 'initializing',
  percent: 0,
  message: '',
  timestamp: Date.now(),
}

// Dashboard query definitions with time-proportional weights
// Weights reflect typical query execution time relative to each other
interface DashboardQuery {
  name: string
  label: string
  weight: number // Relative time weight (higher = slower query)
}

const DASHBOARD_QUERIES: DashboardQuery[] = [
  { name: 'timeline', label: 'Loading timeline data', weight: 50 },      // Heavy GROUP BY
  { name: 'attacks', label: 'Loading attack distribution', weight: 5 },  // Small result set
  { name: 'srcIPs', label: 'Loading top source IPs', weight: 15 },       // GROUP BY + sort
  { name: 'dstIPs', label: 'Loading top destination IPs', weight: 15 },  // GROUP BY + sort
  { name: 'flows', label: 'Loading flow records', weight: 10 },          // Simple LIMIT
  { name: 'flowCount', label: 'Counting total flows', weight: 5 },       // Simple COUNT
]

const TOTAL_WEIGHT = DASHBOARD_QUERIES.reduce((sum, q) => sum + q.weight, 0)
const BUILDING_START_PERCENT = 96
const BUILDING_END_PERCENT = 100

// Calculate progress percent after completing a query at given index
function calculateProgress(completedIndex: number): number {
  const completedWeight = DASHBOARD_QUERIES
    .slice(0, completedIndex + 1)
    .reduce((sum, q) => sum + q.weight, 0)
  const progressRange = BUILDING_END_PERCENT - BUILDING_START_PERCENT
  return Math.round(BUILDING_START_PERCENT + (completedWeight / TOTAL_WEIGHT) * progressRange)
}

export function useNetflowData(parquetUrl: string): UseNetflowDataResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalRows, setTotalRows] = useState(0)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [progress, setProgress] = useState<ProgressEvent>(initialProgress)
  const [logs, setLogs] = useState<LogEntry[]>([])

  const {
    setTimelineData,
    setAttackBreakdown,
    setTopSrcIPs,
    setTopDstIPs,
    setFlows,
    setTotalFlowCount,
  } = useStore()

  const addLog = useCallback((entry: LogEntry) => {
    setLogs((prev) => [...prev, entry])
  }, [])

  const fetchDashboardData = useCallback(async (
    whereClause: string = '1=1',
    onQueryProgress?: (query: DashboardQuery, index: number) => void
  ) => {
    try {
      // Execute queries sequentially with time-proportional progress updates
      // Timeline (weight: 50 = 50% of dashboard build time)
      onQueryProgress?.(DASHBOARD_QUERIES[0], 0)
      const timeline = await getTimelineData(60, whereClause)

      // Attack distribution (weight: 5 = 5% of dashboard build time)
      onQueryProgress?.(DASHBOARD_QUERIES[1], 1)
      const attacks = await getAttackDistribution()

      // Top source IPs (weight: 15 = 15% of dashboard build time)
      onQueryProgress?.(DASHBOARD_QUERIES[2], 2)
      const srcIPs = await getTopTalkers('src', 'flows', 10, whereClause)

      // Top destination IPs (weight: 15 = 15% of dashboard build time)
      onQueryProgress?.(DASHBOARD_QUERIES[3], 3)
      const dstIPs = await getTopTalkers('dst', 'flows', 10, whereClause)

      // Flow records (weight: 10 = 10% of dashboard build time)
      onQueryProgress?.(DASHBOARD_QUERIES[4], 4)
      const flows = await getFlows(whereClause, 1000, 0)

      // Flow count (weight: 5 = 5% of dashboard build time)
      onQueryProgress?.(DASHBOARD_QUERIES[5], 5)
      const flowCount = await getFlowCount(whereClause)

      // Update store
      setTimelineData(timeline)
      setAttackBreakdown(attacks)
      setTopSrcIPs(srcIPs.map((t) => ({ ip: t.ip, value: Number(t.value) })))
      setTopDstIPs(dstIPs.map((t) => ({ ip: t.ip, value: Number(t.value) })))
      setFlows(flows)
      setTotalFlowCount(flowCount)
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
      throw err
    }
  }, [setTimelineData, setAttackBreakdown, setTopSrcIPs, setTopDstIPs, setFlows, setTotalFlowCount])

  const refresh = useCallback(async (whereClause?: string) => {
    await fetchDashboardData(whereClause || '1=1')
  }, [fetchDashboardData])

  useEffect(() => {
    if (dataLoaded || !parquetUrl) return

    async function loadData() {
      try {
        setLoading(true)
        setError(null)
        setLogs([])

        // Load parquet with progress tracking
        const rowCount = await loadParquetData(parquetUrl, {
          onProgress: setProgress,
          onLog: addLog,
        })
        setTotalRows(rowCount)

        // Build dashboard with time-proportional progress
        const handleQueryProgress = (query: DashboardQuery, index: number) => {
          const percent = calculateProgress(index)
          setProgress({
            stage: 'building',
            percent,
            message: query.label + '...',
            timestamp: Date.now(),
          })
          addLog({
            level: 'info',
            message: `${query.label} (${percent}%)`,
            timestamp: Date.now(),
          })
        }

        await fetchDashboardData('1=1', handleQueryProgress)

        // Complete
        setProgress({
          stage: 'complete',
          percent: 100,
          message: `Ready - ${rowCount.toLocaleString()} flows loaded`,
          timestamp: Date.now(),
        })
        addLog({
          level: 'info',
          message: `Dashboard ready with ${rowCount.toLocaleString()} flows`,
          timestamp: Date.now(),
        })
        setDataLoaded(true)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setError(message)
        setProgress({
          stage: 'error',
          percent: 0,
          message,
          timestamp: Date.now(),
        })
        addLog({
          level: 'error',
          message: `Error: ${message}`,
          timestamp: Date.now(),
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [parquetUrl, dataLoaded, fetchDashboardData, addLog])

  return {
    loading,
    error,
    totalRows,
    progress,
    logs,
    refresh,
  }
}

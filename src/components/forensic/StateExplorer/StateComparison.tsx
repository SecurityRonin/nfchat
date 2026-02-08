import { memo } from 'react'
import { formatBytes, formatDuration } from '@/lib/formatting/traffic'
import type { StateProfile } from '@/lib/store/types'

interface StateComparisonProps {
  state1: StateProfile
  state2: StateProfile
}

/**
 * Calculate percentage delta between two values.
 * Returns null if baseline is zero to avoid division by zero.
 */
function calculateDelta(current: number, baseline: number): number | null {
  if (baseline === 0) return null
  return ((current - baseline) / baseline) * 100
}

interface DeltaIndicatorProps {
  delta: number | null
  /** If true, red means higher (suspicious metrics like bytes/duration) */
  redIsHigher?: boolean
}

function DeltaIndicator({ delta, redIsHigher = true }: DeltaIndicatorProps) {
  if (delta === null) return <span className="text-xs text-muted-foreground">N/A</span>

  const isIncrease = delta > 0
  const arrow = isIncrease ? '↑' : '↓'

  // For suspicious metrics (bytes, duration), red = higher, green = lower
  // For benign metrics, reverse
  const colorClass = redIsHigher
    ? (isIncrease ? 'text-red-500' : 'text-green-500')
    : (isIncrease ? 'text-green-500' : 'text-red-500')

  return (
    <span className={`text-xs font-mono ${colorClass}`}>
      {arrow} {Math.abs(delta).toFixed(0)}%
    </span>
  )
}

interface MetricRowProps {
  label: string
  value1: string
  value2: string
  delta: number | null
  redIsHigher?: boolean
}

function MetricRow({ label, value1, value2, delta, redIsHigher }: MetricRowProps) {
  return (
    <div className="flex items-center gap-2 text-xs py-1 border-b border-border">
      <span className="w-24 text-muted-foreground">{label}</span>
      <span className="w-20 font-mono text-right">{value1}</span>
      <DeltaIndicator delta={delta} redIsHigher={redIsHigher} />
      <span className="w-20 font-mono text-right">{value2}</span>
    </div>
  )
}

export const StateComparison = memo(function StateComparison({
  state1,
  state2,
}: StateComparisonProps) {
  const inBytesDelta = calculateDelta(state2.avgInBytes, state1.avgInBytes)
  const outBytesDelta = calculateDelta(state2.avgOutBytes, state1.avgOutBytes)
  const durationDelta = calculateDelta(state2.avgDurationMs, state1.avgDurationMs)
  const pktsDelta = calculateDelta(state2.avgPktsPerSec, state1.avgPktsPerSec)

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1 text-center">
          <span className="font-semibold text-sm">State {state1.stateId}</span>
          <div className="text-xs text-muted-foreground">
            {state1.flowCount.toLocaleString()} flows
          </div>
        </div>
        <div className="px-3 text-muted-foreground">vs</div>
        <div className="flex-1 text-center">
          <span className="font-semibold text-sm">State {state2.stateId}</span>
          <div className="text-xs text-muted-foreground">
            {state2.flowCount.toLocaleString()} flows
          </div>
        </div>
      </div>

      {/* Traffic Metrics */}
      <div className="mb-3">
        <div className="text-xs font-medium text-muted-foreground mb-2">Traffic Profile</div>
        <MetricRow
          label="Avg In"
          value1={formatBytes(state1.avgInBytes)}
          value2={formatBytes(state2.avgInBytes)}
          delta={inBytesDelta}
        />
        <MetricRow
          label="Avg Out"
          value1={formatBytes(state1.avgOutBytes)}
          value2={formatBytes(state2.avgOutBytes)}
          delta={outBytesDelta}
        />
        <MetricRow
          label="Duration"
          value1={formatDuration(state1.avgDurationMs)}
          value2={formatDuration(state2.avgDurationMs)}
          delta={durationDelta}
        />
        <MetricRow
          label="Pkts/sec"
          value1={state1.avgPktsPerSec.toFixed(1)}
          value2={state2.avgPktsPerSec.toFixed(1)}
          delta={pktsDelta}
        />
      </div>

      {/* Protocol Distribution */}
      <div className="mb-3">
        <div className="text-xs font-medium text-muted-foreground mb-2">Protocol Distribution</div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">TCP</span>
                <span className="font-mono">{Math.round(state1.protocolDist.tcp * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">UDP</span>
                <span className="font-mono">{Math.round(state1.protocolDist.udp * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ICMP</span>
                <span className="font-mono">{Math.round(state1.protocolDist.icmp * 100)}%</span>
              </div>
            </div>
          </div>
          <div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">TCP</span>
                <span className="font-mono">{Math.round(state2.protocolDist.tcp * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">UDP</span>
                <span className="font-mono">{Math.round(state2.protocolDist.udp * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ICMP</span>
                <span className="font-mono">{Math.round(state2.protocolDist.icmp * 100)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Port Category Distribution */}
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-2">Port Categories</div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Well-known</span>
                <span className="font-mono">{Math.round(state1.portCategoryDist.wellKnown * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Registered</span>
                <span className="font-mono">{Math.round(state1.portCategoryDist.registered * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ephemeral</span>
                <span className="font-mono">{Math.round(state1.portCategoryDist.ephemeral * 100)}%</span>
              </div>
            </div>
          </div>
          <div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Well-known</span>
                <span className="font-mono">{Math.round(state2.portCategoryDist.wellKnown * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Registered</span>
                <span className="font-mono">{Math.round(state2.portCategoryDist.registered * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ephemeral</span>
                <span className="font-mono">{Math.round(state2.portCategoryDist.ephemeral * 100)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

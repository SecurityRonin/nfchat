import { useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { ATTACK_TYPES } from '@/lib/schema'
import { useContainerDimensions } from '@/hooks/useContainerDimensions'
import { LightweightStackedAreaChart } from './charts'

export interface TimelineData {
  time: number
  attack: string
  count: number
}

interface TimelineProps {
  data: TimelineData[]
  loading?: boolean
  showLegend?: boolean
  onBrushChange?: (start: number, end: number) => void
}

interface StackedDataPoint {
  time: number
  [key: string]: number
}

function transformToStacked(data: TimelineData[]): StackedDataPoint[] {
  const grouped = new Map<number, StackedDataPoint>()

  for (const item of data) {
    if (!grouped.has(item.time)) {
      grouped.set(item.time, { time: item.time })
    }
    const point = grouped.get(item.time)!
    point[item.attack] = (point[item.attack] || 0) + item.count
  }

  return Array.from(grouped.values()).sort((a, b) => a.time - b.time)
}

export function TimelineChart({
  data,
  loading = false,
  showLegend = false,
  onBrushChange,
}: TimelineProps) {
  const { ref: containerRef, isReady, width, height } = useContainerDimensions()

  const stackedData = useMemo(() => transformToStacked(data), [data])

  const attackTypesInData = useMemo(() => {
    const types = new Set<string>()
    for (const item of data) {
      types.add(item.attack)
    }
    return ATTACK_TYPES.filter((t) => types.has(t))
  }, [data])

  if (loading) {
    return (
      <div
        data-testid="timeline-loading"
        className="flex items-center justify-center h-full"
      >
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div
        data-testid="timeline-chart"
        className="flex items-center justify-center h-full text-muted-foreground text-sm"
      >
        No data available
      </div>
    )
  }

  return (
    <div ref={containerRef} data-testid="timeline-chart" className="h-full w-full">
      {isReady && width > 0 && height > 0 && (
        <LightweightStackedAreaChart
          data={stackedData}
          keys={attackTypesInData}
          width={width}
          height={height}
          onBrushChange={onBrushChange}
        />
      )}
      {showLegend && (
        <div className="flex flex-wrap gap-2 mt-2 px-2">
          {attackTypesInData.map((type) => (
            <div key={type} className="flex items-center gap-1 text-xs">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: `var(--attack-${type.toLowerCase().replace(/[^a-z]/g, '-')})` }}
              />
              <span className="text-muted-foreground">{type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

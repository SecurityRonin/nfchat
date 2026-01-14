import { useMemo, memo, useState, useCallback } from 'react'
import { ATTACK_COLORS, type AttackType } from '@/lib/schema'

interface StackedDataPoint {
  time: number
  [key: string]: number
}

interface LightweightStackedAreaChartProps {
  data: StackedDataPoint[]
  keys: string[]
  width: number
  height: number
  onBrushChange?: (start: number, end: number) => void
}

/**
 * Ultra-lightweight stacked SVG area chart.
 * Replaces Recharts AreaChart with stacked areas.
 * Single render pass, minimal DOM elements.
 */
export const LightweightStackedAreaChart = memo(function LightweightStackedAreaChart({
  data,
  keys,
  width,
  height,
  onBrushChange,
}: LightweightStackedAreaChartProps) {
  const [brushStart, setBrushStart] = useState<number | null>(null)
  const [brushEnd, setBrushEnd] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Compute stacked areas
  const { areas, xScale, timeRange } = useMemo(() => {
    if (data.length === 0 || width <= 0 || height <= 0) {
      return { areas: [], xScale: () => 0, timeRange: { min: 0, max: 0 } }
    }

    const padding = { top: 10, right: 10, bottom: 30, left: 40 }
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    // Sort by time
    const sortedData = [...data].sort((a, b) => a.time - b.time)

    // Find bounds
    const times = sortedData.map((d) => d.time)
    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)
    const timeRangeVal = maxTime - minTime || 1

    // Calculate max stacked value
    let maxStackedValue = 0
    for (const d of sortedData) {
      let stackedValue = 0
      for (const key of keys) {
        stackedValue += d[key] || 0
      }
      maxStackedValue = Math.max(maxStackedValue, stackedValue)
    }
    maxStackedValue = maxStackedValue || 1

    // Scale functions
    const scaleX = (time: number) =>
      padding.left + ((time - minTime) / timeRangeVal) * chartWidth
    const scaleY = (value: number) =>
      padding.top + chartHeight - (value / maxStackedValue) * chartHeight

    // Build stacked areas (bottom to top)
    const areasResult: { key: string; path: string; color: string }[] = []
    const baseline = new Array(sortedData.length).fill(0)

    for (const key of keys) {
      const topPoints: string[] = []
      const bottomPoints: string[] = []

      for (let i = 0; i < sortedData.length; i++) {
        const d = sortedData[i]
        const value = d[key] || 0
        const y0 = baseline[i]
        const y1 = y0 + value

        topPoints.push(`${scaleX(d.time)},${scaleY(y1)}`)
        bottomPoints.unshift(`${scaleX(d.time)},${scaleY(y0)}`)

        baseline[i] = y1
      }

      const path = `M${topPoints.join(' L')} L${bottomPoints.join(' L')} Z`
      const color = ATTACK_COLORS[key as AttackType] || '#6b7280'

      areasResult.push({ key, path, color })
    }

    return {
      areas: areasResult,
      xScale: scaleX,
      timeRange: { min: minTime, max: maxTime },
    }
  }, [data, keys, width, height])

  // X-axis ticks
  const xTicks = useMemo(() => {
    if (data.length === 0) return []

    const tickCount = Math.min(6, data.length)
    const sortedData = [...data].sort((a, b) => a.time - b.time)
    const step = Math.floor(sortedData.length / tickCount)

    const ticks: { x: number; label: string }[] = []
    for (let i = 0; i < sortedData.length; i += step) {
      const time = sortedData[i].time
      const date = new Date(time)
      ticks.push({
        x: xScale(time),
        label: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      })
    }
    return ticks
  }, [data, xScale])

  // Brush handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!onBrushChange) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    setBrushStart(x)
    setBrushEnd(x)
    setIsDragging(true)
  }, [onBrushChange])

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    setBrushEnd(x)
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    if (!isDragging || brushStart === null || brushEnd === null) return
    setIsDragging(false)

    if (onBrushChange && Math.abs(brushEnd - brushStart) > 10) {
      const padding = 40 // left padding
      const chartWidth = width - 50 // total padding
      const range = timeRange.max - timeRange.min

      const startPct = Math.max(0, (Math.min(brushStart, brushEnd) - padding) / chartWidth)
      const endPct = Math.min(1, (Math.max(brushStart, brushEnd) - padding) / chartWidth)

      const startTime = timeRange.min + startPct * range
      const endTime = timeRange.min + endPct * range

      onBrushChange(startTime, endTime)
    }

    setBrushStart(null)
    setBrushEnd(null)
  }, [isDragging, brushStart, brushEnd, width, timeRange, onBrushChange])

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        No data available
      </div>
    )
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block', cursor: onBrushChange ? 'crosshair' : 'default' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Areas (rendered bottom to top) */}
      {areas.map(({ key, path, color }) => (
        <path
          key={key}
          d={path}
          fill={color}
          fillOpacity={0.6}
          stroke={color}
          strokeWidth={0.5}
        />
      ))}

      {/* X-axis */}
      <line
        x1={40}
        y1={height - 30}
        x2={width - 10}
        y2={height - 30}
        stroke="hsl(var(--muted-foreground))"
        strokeWidth={1}
        strokeOpacity={0.3}
      />

      {/* X-axis ticks */}
      {xTicks.map(({ x, label }, i) => (
        <g key={i}>
          <line
            x1={x}
            y1={height - 30}
            x2={x}
            y2={height - 26}
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={1}
            strokeOpacity={0.5}
          />
          <text
            x={x}
            y={height - 10}
            textAnchor="middle"
            fontSize={10}
            fill="hsl(var(--muted-foreground))"
          >
            {label}
          </text>
        </g>
      ))}

      {/* Brush selection overlay */}
      {isDragging && brushStart !== null && brushEnd !== null && (
        <rect
          x={Math.min(brushStart, brushEnd)}
          y={10}
          width={Math.abs(brushEnd - brushStart)}
          height={height - 40}
          fill="hsl(var(--primary))"
          fillOpacity={0.2}
          stroke="hsl(var(--primary))"
          strokeWidth={1}
        />
      )}
    </svg>
  )
})

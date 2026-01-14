import { useEffect, useRef, useMemo, useCallback, memo } from 'react'
import { useStore } from '@/lib/store'
import { useContainerDimensions } from '@/hooks/useContainerDimensions'
import { PREMIERE_COLORS, TIMELINE_CONFIG } from './constants'
import { pixelToTime, timeToPercent } from './utils'
import { TimecodeDisplay } from './TimecodeDisplay'
import { TimeRuler } from './TimeRuler'
import { Playhead } from './Playhead'
import { PlaybackControls } from './PlaybackControls'
import type { ProTimelineProps } from './types'
import { LightweightAreaChart } from '../charts'

interface TimelineDataPoint {
  time: number
  attack: string
  count: number
}

interface AggregatedDataPoint {
  time: number
  count: number
}

/**
 * Aggregate data points for visualization (group by time bucket)
 */
function aggregateData(data: TimelineDataPoint[]): AggregatedDataPoint[] {
  const byTime = new Map<number, number>()
  for (const point of data) {
    byTime.set(point.time, (byTime.get(point.time) || 0) + point.count)
  }
  return Array.from(byTime.entries())
    .map(([time, count]) => ({ time, count }))
    .sort((a, b) => a.time - b.time)
}

/**
 * Memoized chart component that only re-renders when data changes.
 * Uses lightweight SVG chart - no Recharts overhead.
 */
const TimelineChart = memo(function TimelineChart({
  chartData,
  containerReady,
  width,
  height,
}: {
  chartData: AggregatedDataPoint[]
  containerReady: boolean
  width: number
  height: number
}) {
  if (!containerReady || chartData.length === 0 || width <= 0 || height <= 0) {
    return null
  }

  return (
    <LightweightAreaChart
      data={chartData}
      width={width}
      height={height}
      fillColor={PREMIERE_COLORS.playhead}
      strokeColor={PREMIERE_COLORS.playhead}
      fillOpacity={0.3}
    />
  )
})

/**
 * Memoized playhead wrapper that subscribes only to currentTime.
 * This isolates the high-frequency updates from the rest of the component.
 */
const PlayheadWrapper = memo(function PlayheadWrapper({
  timeRangeStart,
  timeRangeEnd,
  visible,
  onDrag,
}: {
  timeRangeStart: number
  timeRangeEnd: number
  visible: boolean
  onDrag: (clientX: number) => void
}) {
  // Fine-grained selector - only subscribes to currentTime
  const currentTime = useStore((s) => s.playback.currentTime)

  const position = timeToPercent(currentTime, timeRangeStart, timeRangeEnd)

  return (
    <Playhead
      position={position}
      visible={visible}
      onDrag={onDrag}
    />
  )
})

/**
 * Memoized timecode display that subscribes only to playback fields it needs.
 */
const TimecodeWrapper = memo(function TimecodeWrapper({
  timeRangeStart,
}: {
  timeRangeStart: number
}) {
  // Fine-grained selectors for each field used
  const currentTime = useStore((s) => s.playback.currentTime)
  const duration = useStore((s) => s.playback.duration)
  const inPoint = useStore((s) => s.playback.inPoint)
  const outPoint = useStore((s) => s.playback.outPoint)

  return (
    <TimecodeDisplay
      currentTime={currentTime - timeRangeStart}
      duration={duration}
      inPoint={inPoint ? inPoint - timeRangeStart : null}
      outPoint={outPoint ? outPoint - timeRangeStart : null}
    />
  )
})

/**
 * Memoized playback controls that subscribe only to needed fields.
 */
const PlaybackControlsWrapper = memo(function PlaybackControlsWrapper({
  disabled,
  timeRangeStart,
  onTimeChange,
}: {
  disabled: boolean
  timeRangeStart: number
  onTimeChange?: (time: number) => void
}) {
  // Fine-grained selectors
  const isPlaying = useStore((s) => s.playback.isPlaying)
  const speed = useStore((s) => s.playback.speed)
  const inPoint = useStore((s) => s.playback.inPoint)
  const setIsPlaying = useStore((s) => s.setIsPlaying)
  const setPlaybackSpeed = useStore((s) => s.setPlaybackSpeed)
  const setCurrentTime = useStore((s) => s.setCurrentTime)

  const handlePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying)
  }, [isPlaying, setIsPlaying])

  const handleRewind = useCallback(() => {
    const rewindTo = inPoint ?? timeRangeStart
    setCurrentTime(rewindTo)
    onTimeChange?.(rewindTo)
  }, [inPoint, timeRangeStart, setCurrentTime, onTimeChange])

  return (
    <PlaybackControls
      isPlaying={isPlaying}
      speed={speed}
      disabled={disabled}
      onPlayPause={handlePlayPause}
      onRewind={handleRewind}
      onSpeedChange={setPlaybackSpeed}
    />
  )
})

/**
 * Professional Premiere Pro-style timeline with playback controls,
 * timecode display, and data visualization.
 *
 * Performance optimized:
 * - Chart is memoized and only re-renders when data changes
 * - Playhead uses fine-grained store selector for currentTime only
 * - Animation loop uses refs to avoid re-render dependencies
 */
export function ProTimeline({
  data,
  markers = [],
  loading = false,
  onTimeChange,
  onMarkerClick,
}: ProTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | undefined>(undefined)
  const lastTickRef = useRef<number>(0)
  // Use refs for animation loop to avoid re-creating effect on every render
  const playbackRef = useRef({ isPlaying: false, speed: 1, currentTime: 0, inPoint: null as number | null, outPoint: null as number | null })
  const timeRangeRef = useRef({ start: 0, end: 0 })

  // Use ResizeObserver-based hook for reliable dimension tracking
  const { setRef: setContainerRef, isReady: containerReady, width: trackWidth } = useContainerDimensions()

  // Combined ref callback that sets both refs
  const setTrackRef = useCallback((el: HTMLDivElement | null) => {
    trackRef.current = el
    setContainerRef(el)
  }, [setContainerRef])

  // Fine-grained Zustand selectors - only subscribe to what we need
  const isPlaying = useStore((s) => s.playback.isPlaying)
  const speed = useStore((s) => s.playback.speed)
  const currentTime = useStore((s) => s.playback.currentTime)
  const inPoint = useStore((s) => s.playback.inPoint)
  const outPoint = useStore((s) => s.playback.outPoint)
  const setCurrentTime = useStore((s) => s.setCurrentTime)
  const setPlaybackDuration = useStore((s) => s.setPlaybackDuration)

  // Keep refs in sync for animation loop (avoids effect dependencies)
  useEffect(() => {
    playbackRef.current = { isPlaying, speed, currentTime, inPoint, outPoint }
  }, [isPlaying, speed, currentTime, inPoint, outPoint])

  // Compute time range from data
  const timeRange = useMemo(() => {
    if (data.length === 0) return { start: 0, end: 0 }
    const times = data.map((d) => d.time)
    return { start: Math.min(...times), end: Math.max(...times) }
  }, [data])

  // Keep timeRange ref in sync
  useEffect(() => {
    timeRangeRef.current = timeRange
  }, [timeRange])

  // Set duration when data changes
  useEffect(() => {
    const duration = timeRange.end - timeRange.start
    if (duration > 0) {
      setPlaybackDuration(duration)
      setCurrentTime(timeRange.start)
    }
  }, [timeRange, setPlaybackDuration, setCurrentTime])

  // Aggregated data for chart - memoized
  const chartData = useMemo(() => aggregateData(data), [data])

  // Playback animation loop - uses refs to avoid re-creating on every state change
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = undefined
      }
      return
    }

    const tick = (timestamp: number) => {
      if (lastTickRef.current === 0) {
        lastTickRef.current = timestamp
      }

      const delta = timestamp - lastTickRef.current
      lastTickRef.current = timestamp

      const pb = playbackRef.current
      const tr = timeRangeRef.current
      const newTime = pb.currentTime + delta * pb.speed

      // Check if we've reached the end
      const endTime = pb.outPoint ?? tr.end
      if (newTime >= endTime) {
        setCurrentTime(pb.inPoint ?? tr.start)
      } else {
        setCurrentTime(newTime)
        onTimeChange?.(newTime)
      }

      animationRef.current = requestAnimationFrame(tick)
    }

    lastTickRef.current = 0
    animationRef.current = requestAnimationFrame(tick)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = undefined
      }
    }
  }, [isPlaying, setCurrentTime, onTimeChange])

  // Handle click on track to seek
  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      if (!trackRef.current) return

      const rect = trackRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const time = pixelToTime(x, rect.width, timeRange.start, timeRange.end)

      setCurrentTime(time)
      onTimeChange?.(time)
    },
    [timeRange, setCurrentTime, onTimeChange]
  )

  // Handle playhead drag
  const handlePlayheadDrag = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return

      const rect = trackRef.current.getBoundingClientRect()
      const x = clientX - rect.left
      const time = pixelToTime(x, rect.width, timeRange.start, timeRange.end)

      setCurrentTime(time)
      onTimeChange?.(time)
    },
    [timeRange, setCurrentTime, onTimeChange]
  )

  // Use width from hook, with fallback for initial render
  const rulerWidth = trackWidth > 0 ? trackWidth : 800

  if (loading) {
    return (
      <div
        className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg flex items-center justify-center"
        style={{ height: 200 }}
      >
        <span style={{ color: PREMIERE_COLORS.textDim }}>Loading timeline...</span>
      </div>
    )
  }

  return (
    <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg overflow-hidden">
      {/* Controls bar */}
      <div
        className="flex items-center justify-between px-3 border-b border-[#2a2a2a]"
        style={{
          height: TIMELINE_CONFIG.controlsHeight,
          backgroundColor: PREMIERE_COLORS.panelBg,
        }}
      >
        <PlaybackControlsWrapper
          disabled={data.length === 0}
          timeRangeStart={timeRange.start}
          onTimeChange={onTimeChange}
        />

        <TimecodeWrapper timeRangeStart={timeRange.start} />
      </div>

      {/* Time ruler */}
      <TimeRuler
        startTime={timeRange.start}
        endTime={timeRange.end}
        width={rulerWidth}
      />

      {/* Track area with visualization */}
      <div
        ref={setTrackRef}
        data-timeline-track
        className="relative cursor-crosshair"
        style={{
          height: TIMELINE_CONFIG.trackHeight,
          backgroundColor: PREMIERE_COLORS.trackBg,
        }}
        onClick={handleTrackClick}
      >
        {/* Chart visualization - memoized, only re-renders when data changes */}
        <TimelineChart
          chartData={chartData}
          containerReady={containerReady}
          width={trackWidth}
          height={TIMELINE_CONFIG.trackHeight}
        />

        {/* Playhead - uses its own store subscription for currentTime */}
        <PlayheadWrapper
          timeRangeStart={timeRange.start}
          timeRangeEnd={timeRange.end}
          visible={data.length > 0}
          onDrag={handlePlayheadDrag}
        />

        {/* Markers */}
        {markers.map((marker) => {
          const pos = timeToPercent(marker.time, timeRange.start, timeRange.end)
          return (
            <div
              key={marker.id}
              className="absolute top-0 bottom-0 cursor-pointer"
              style={{
                left: `${pos}%`,
                width: 4,
                backgroundColor: PREMIERE_COLORS.severity[marker.severity],
                opacity: 0.8,
              }}
              onClick={(e) => {
                e.stopPropagation()
                onMarkerClick?.(marker)
              }}
              title={marker.label}
            />
          )
        })}
      </div>
    </div>
  )
}

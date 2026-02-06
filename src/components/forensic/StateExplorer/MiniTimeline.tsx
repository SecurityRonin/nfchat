import { memo } from 'react'

interface TimelineBucket {
  bucket: number
  count: number
}

interface MiniTimelineProps {
  buckets: TimelineBucket[]
  width?: number
  height?: number
}

export const MiniTimeline = memo(function MiniTimeline({
  buckets,
  width = 200,
  height = 40,
}: MiniTimelineProps) {
  if (buckets.length === 0) return null

  const maxCount = Math.max(...buckets.map((b) => b.count), 1)
  const padding = 2

  const points = buckets
    .map((b, i) => {
      const x = buckets.length === 1
        ? width / 2
        : padding + (i / (buckets.length - 1)) * (width - 2 * padding)
      const y = height - padding - ((b.count / maxCount) * (height - 2 * padding))
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg
      role="img"
      aria-label="Flow timeline"
      width={width}
      height={height}
      className="text-primary"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
})

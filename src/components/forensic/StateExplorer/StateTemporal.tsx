import { memo, useMemo } from 'react'
import type { TemporalBucket } from '@/lib/motherduck/queries/hmm'

const STATE_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f97316', '#a855f7',
  '#ec4899', '#14b8a6', '#eab308', '#6366f1', '#78716c',
]

interface StateTemporalProps {
  buckets: TemporalBucket[]
  nStates: number
}

interface GroupedBucket {
  label: string
  states: Map<number, number>
  total: number
}

function formatBucketLabel(bucket: string | unknown): string {
  const s = String(bucket)
  const match = s.match(/(\d{2}:\d{2})/)
  return match ? match[1] : s
}

export const StateTemporal = memo(function StateTemporal({
  buckets,
  nStates,
}: StateTemporalProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, GroupedBucket>()
    for (const b of buckets) {
      const key = String(b.bucket)
      let entry = map.get(key)
      if (!entry) {
        entry = { label: formatBucketLabel(b.bucket), states: new Map(), total: 0 }
        map.set(key, entry)
      }
      entry.states.set(b.stateId, b.count)
      entry.total += b.count
    }
    return Array.from(map.values())
  }, [buckets])

  if (grouped.length === 0) return null

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">Temporal Distribution</h3>
      <div className="space-y-1">
        {grouped.map((g, idx) => (
          <div key={idx} data-bucket={g.label}>
            <div className="flex h-5 rounded overflow-hidden">
              {Array.from({ length: nStates }, (_, stateId) => {
                const count = g.states.get(stateId) || 0
                if (count === 0) return null
                const widthPct = (count / g.total) * 100
                return (
                  <div
                    key={stateId}
                    data-state-id={stateId}
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: STATE_COLORS[stateId % STATE_COLORS.length],
                    }}
                  />
                )
              })}
            </div>
            <div className="text-[10px] text-muted-foreground">{g.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
})

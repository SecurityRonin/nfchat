import { useState } from 'react'
import { Progress } from '@/components/ui/progress'

interface DiscoveryControlsProps {
  onDiscover: (stateCount: number) => void
  training: boolean
  progress: number
  statesDiscovered: number
  error: string | null
}

const STATE_OPTIONS = [
  { value: 0, label: 'Auto' },
  { value: 4, label: '4' },
  { value: 6, label: '6' },
  { value: 8, label: '8' },
  { value: 10, label: '10' },
  { value: 12, label: '12' },
  { value: 15, label: '15' },
]

export function DiscoveryControls({
  onDiscover,
  training,
  progress,
  statesDiscovered,
  error,
}: DiscoveryControlsProps) {
  const [stateCount, setStateCount] = useState(0)

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
      <div className="flex items-center gap-2">
        <label htmlFor="state-count" className="text-sm text-muted-foreground">
          States
        </label>
        <select
          id="state-count"
          value={stateCount}
          onChange={(e) => setStateCount(Number(e.target.value))}
          className="h-8 rounded border border-border bg-background px-2 text-sm"
          disabled={training}
        >
          {STATE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={() => onDiscover(stateCount)}
        disabled={training}
        className="px-3 py-1.5 text-sm font-medium rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {training ? 'Training...' : 'Discover States'}
      </button>

      {training && (
        <div className="flex-1 max-w-xs">
          <Progress value={progress} />
        </div>
      )}

      {!training && statesDiscovered > 0 && (
        <span className="text-sm text-muted-foreground">
          {statesDiscovered} states discovered
        </span>
      )}

      {error && (
        <span className="text-sm text-destructive">{error}</span>
      )}
    </div>
  )
}

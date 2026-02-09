import { Progress } from '@/components/ui/progress'

interface DiscoveryControlsProps {
  onDiscover: () => void
  training: boolean
  progress: number
  statesDiscovered: number
  error: string | null
  converged?: boolean | null
  iterations?: number | null
}

export function DiscoveryControls({
  onDiscover,
  training,
  progress,
  statesDiscovered,
  error,
  converged = null,
  iterations = null,
}: DiscoveryControlsProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
      <button
        onClick={() => onDiscover()}
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
          {converged === true && iterations != null && (
            <> &middot; Converged after {iterations} iterations</>
          )}
          {converged === false && iterations != null && (
            <> &middot; Did not converge ({iterations} iterations)</>
          )}
        </span>
      )}

      {error && (
        <span className="text-sm text-destructive">{error}</span>
      )}
    </div>
  )
}

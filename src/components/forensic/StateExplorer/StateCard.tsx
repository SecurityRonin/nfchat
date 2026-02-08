import { memo, useEffect, useState } from 'react'
import { ATTACK_COLORS } from '@/lib/schema'
import { useStore } from '@/lib/store'
import { getSampleFlows, getStateTopHosts, getStateTimeline, getStateConnStates, getStatePortServices } from '@/lib/motherduck/queries'
import { TacticSelector } from './TacticSelector'
import { MiniTimeline } from './MiniTimeline'
import { FlowPreview } from './FlowPreview'
import type { StateProfile } from '@/lib/store/types'
import type { FlowRecord } from '@/lib/schema'
import type { HostCount, TimelineBucket, ConnStateCount, PortCount, ServiceCount } from '@/lib/motherduck/queries/hmm'

interface StateCardProps {
  state: StateProfile
  assignedTactic?: string
  onTacticAssign: (stateId: number, tactic: string) => void
  expanded: boolean
  onToggleExpand: () => void
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)}MB`
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)}KB`
  return `${Math.round(bytes)}B`
}

function formatDuration(ms: number): string {
  if (ms >= 60_000) return `${(ms / 60_000).toFixed(1)}m`
  if (ms >= 1_000) return `${(ms / 1_000).toFixed(1)}s`
  return `${Math.round(ms)}ms`
}

function PercentBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100)
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-10 text-muted-foreground">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded overflow-hidden">
        <div
          className="h-full bg-primary/60 rounded"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right font-mono">{pct}%</span>
    </div>
  )
}

export const StateCard = memo(function StateCard({
  state,
  assignedTactic,
  onTacticAssign,
  expanded,
  onToggleExpand,
}: StateCardProps) {
  const [sampleFlows, setSampleFlows] = useState<Partial<FlowRecord>[]>([])
  const [flowsLoading, setFlowsLoading] = useState(false)
  const [topHosts, setTopHosts] = useState<{ srcHosts: HostCount[]; dstHosts: HostCount[] }>({ srcHosts: [], dstHosts: [] })
  const [timeline, setTimeline] = useState<TimelineBucket[]>([])
  const [connStates, setConnStates] = useState<ConnStateCount[]>([])
  const [portServices, setPortServices] = useState<{ ports: PortCount[]; services: ServiceCount[] }>({ ports: [], services: [] })

  const currentTactic = assignedTactic ?? state.suggestedTactic
  const tacticColor = ATTACK_COLORS[currentTactic] || '#71717a'

  // Load detail data when expanded
  useEffect(() => {
    if (!expanded) return
    let cancelled = false

    async function loadDetails() {
      const [hosts, tl, cs, ps] = await Promise.all([
        getStateTopHosts(state.stateId),
        getStateTimeline(state.stateId),
        getStateConnStates(state.stateId),
        getStatePortServices(state.stateId),
      ])
      if (!cancelled) {
        setTopHosts(hosts)
        setTimeline(tl)
        setConnStates(cs)
        setPortServices(ps)
      }
    }

    loadDetails()
    return () => { cancelled = true }
  }, [expanded, state.stateId])

  // Load sample flows when expanded
  useEffect(() => {
    if (!expanded) return
    let cancelled = false

    async function loadFlows() {
      setFlowsLoading(true)
      const flows = await getSampleFlows(state.stateId)
      if (!cancelled) {
        setSampleFlows(flows)
        setFlowsLoading(false)
      }
    }

    loadFlows()
    return () => { cancelled = true }
  }, [expanded, state.stateId])

  return (
    <div
      className="rounded-lg border border-border bg-card p-4"
      style={{ borderLeftColor: tacticColor, borderLeftWidth: 3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">State {state.stateId}</span>
          <span className="text-xs text-muted-foreground">
            {state.flowCount.toLocaleString()} flows
          </span>
          <button
            className="text-xs text-primary hover:underline"
            onClick={() => {
              useStore.getState().setSelectedHmmState(state.stateId)
              useStore.getState().setActiveView('dashboard')
            }}
          >
            View Flows →
          </button>
        </div>
        <TacticSelector
          stateId={state.stateId}
          suggestedTactic={state.suggestedTactic}
          suggestedConfidence={state.suggestedConfidence}
          assignedTactic={assignedTactic}
          onAssign={onTacticAssign}
        />
      </div>

      {/* Traffic Profile */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
        <div>
          <div className="text-muted-foreground">Avg In</div>
          <div className="font-mono font-medium">{formatBytes(state.avgInBytes)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Avg Out</div>
          <div className="font-mono font-medium">{formatBytes(state.avgOutBytes)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Duration</div>
          <div className="font-mono font-medium">{formatDuration(state.avgDurationMs)}</div>
        </div>
      </div>

      {/* Protocol Distribution */}
      <div className="space-y-1 mb-3">
        <PercentBar label="TCP" value={state.protocolDist.tcp} />
        <PercentBar label="UDP" value={state.protocolDist.udp} />
        {state.protocolDist.icmp > 0.01 && (
          <PercentBar label="ICMP" value={state.protocolDist.icmp} />
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="space-y-3 mt-3 pt-3 border-t border-border">
          {/* Top Hosts */}
          {(topHosts.srcHosts.length > 0 || topHosts.dstHosts.length > 0) && (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-muted-foreground font-medium mb-1">Top Sources</div>
                {topHosts.srcHosts.map((h) => (
                  <div key={h.ip} className="font-mono flex justify-between">
                    <span>{h.ip}</span>
                    <span className="text-muted-foreground">{h.count}</span>
                  </div>
                ))}
              </div>
              <div>
                <div className="text-muted-foreground font-medium mb-1">Top Destinations</div>
                {topHosts.dstHosts.map((h) => (
                  <div key={h.ip} className="font-mono flex justify-between">
                    <span>{h.ip}</span>
                    <span className="text-muted-foreground">{h.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connection States */}
          {connStates.length > 0 && (
            <div className="text-xs">
              <div className="text-muted-foreground font-medium mb-1">Connection States</div>
              <div className="flex flex-wrap gap-1">
                {connStates.map((cs) => (
                  <span key={cs.state} className="px-1.5 py-0.5 rounded bg-muted font-mono">
                    {cs.state}: {cs.count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          {timeline.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground font-medium mb-1">Timeline</div>
              <MiniTimeline buckets={timeline} />
            </div>
          )}

          {/* Ports & Services */}
          {(portServices.ports.length > 0 || portServices.services.length > 0) && (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-muted-foreground font-medium mb-1">Top Ports</div>
                {portServices.ports.map((p) => (
                  <div key={p.port} className="font-mono flex justify-between">
                    <span>{p.port}</span>
                    <span className="text-muted-foreground">{p.count}</span>
                  </div>
                ))}
              </div>
              {portServices.services.length > 0 && (
                <div>
                  <div className="text-muted-foreground font-medium mb-1">Services</div>
                  {portServices.services.map((s) => (
                    <div key={s.service} className="font-mono flex justify-between">
                      <span>{s.service}</span>
                      <span className="text-muted-foreground">{s.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Flow Preview */}
      <FlowPreview
        flows={sampleFlows}
        totalFlowCount={state.flowCount}
        loading={flowsLoading}
        expanded={expanded}
        onExpand={onToggleExpand}
      />
    </div>
  )
})

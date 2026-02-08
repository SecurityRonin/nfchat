import { memo } from 'react'
import type { FlowRecord } from '@/lib/schema'

interface FlowPreviewProps {
  flows: Partial<FlowRecord>[]
  totalFlowCount: number
  loading: boolean
  expanded: boolean
  onExpand: () => void
}

const COLUMNS = [
  { key: 'IPV4_SRC_ADDR', label: 'Src IP' },
  { key: 'IPV4_DST_ADDR', label: 'Dst IP' },
  { key: 'PROTOCOL', label: 'Proto' },
  { key: 'L4_DST_PORT', label: 'Dst Port' },
  { key: 'IN_BYTES', label: 'In Bytes' },
  { key: 'OUT_BYTES', label: 'Out Bytes' },
  { key: 'FLOW_DURATION_MILLISECONDS', label: 'Duration (ms)' },
] as const

export const FlowPreview = memo(function FlowPreview({
  flows,
  totalFlowCount,
  loading,
  expanded,
  onExpand,
}: FlowPreviewProps) {
  const displayCount = expanded ? flows.length : totalFlowCount
  return (
    <div className="border-t border-border mt-2 pt-2">
      <button
        onClick={onExpand}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? '▾ Sample Flows' : '▸ Sample Flows'} ({displayCount.toLocaleString()})
      </button>

      {expanded && (
        <div className="mt-2 max-h-60 overflow-auto">
          {loading ? (
            <div className="text-xs text-muted-foreground py-2">Loading flows...</div>
          ) : flows.length === 0 ? (
            <div className="text-xs text-muted-foreground py-2">No sample flows available</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {COLUMNS.map((col) => (
                    <th key={col.key} className="text-left py-1 px-1 font-medium text-muted-foreground">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {flows.map((flow, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/50">
                    {COLUMNS.map((col) => (
                      <td key={col.key} className="py-1 px-1 font-mono">
                        {String(flow[col.key as keyof typeof flow] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
})

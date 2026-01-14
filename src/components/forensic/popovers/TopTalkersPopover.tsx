import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { TopTalkerData } from '@/lib/store'

interface TopTalkersPopoverProps {
  topSrcIPs: TopTalkerData[]
  topDstIPs: TopTalkerData[]
  onFilter: (column: string, value: string) => void
}

function formatValue(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

interface IPListProps {
  data: TopTalkerData[]
  column: string
  onFilter: (column: string, value: string) => void
}

function IPList({ data, column, onFilter }: IPListProps) {
  if (data.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-2">
        No IPs found
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {data.map((item) => (
        <div key={item.ip} className="flex items-center justify-between text-sm">
          <span className="font-mono">{item.ip}</span>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{formatValue(item.value)}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => onFilter(column, item.ip)}
            >
              Filter
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

export function TopTalkersPopover({
  topSrcIPs,
  topDstIPs,
  onFilter,
}: TopTalkersPopoverProps) {
  // Show empty state if no data at all
  if (topSrcIPs.length === 0 && topDstIPs.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>No IP data</span>
      </div>
    )
  }

  // Get top source IP for trigger display
  const topSrc = topSrcIPs.length > 0 ? topSrcIPs[0] : null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto py-1 px-2 font-normal"
        >
          <span className="text-muted-foreground mr-1">Top Src:</span>
          <span className="font-medium font-mono">
            {topSrc ? topSrc.ip : 'N/A'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Top Talkers</h4>
          <Tabs defaultValue="source">
            <TabsList className="w-full">
              <TabsTrigger value="source" className="flex-1">
                Source
              </TabsTrigger>
              <TabsTrigger value="dest" className="flex-1">
                Dest
              </TabsTrigger>
            </TabsList>
            <TabsContent value="source" className="mt-2">
              <IPList
                data={topSrcIPs}
                column="IPV4_SRC_ADDR"
                onFilter={onFilter}
              />
            </TabsContent>
            <TabsContent value="dest" className="mt-2">
              <IPList
                data={topDstIPs}
                column="IPV4_DST_ADDR"
                onFilter={onFilter}
              />
            </TabsContent>
          </Tabs>
        </div>
      </PopoverContent>
    </Popover>
  )
}

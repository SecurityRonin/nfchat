import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ATTACK_COLORS, type AttackType } from '@/lib/schema'
import type { AttackBreakdownData } from '@/lib/store'

interface AttackPopoverProps {
  data: AttackBreakdownData[]
  onFilter: (column: string, value: string) => void
}

export function AttackPopover({ data, onFilter }: AttackPopoverProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>🎯</span>
        <span>No attacks detected</span>
      </div>
    )
  }

  // Calculate total and find top attack
  const total = data.reduce((sum, d) => sum + d.count, 0)
  const topAttack = data.reduce((a, b) => (a.count > b.count ? a : b))
  const topPercent = total > 0 ? Math.round((topAttack.count / total) * 100) : 0

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto py-1 px-2 font-normal"
        >
          <span className="text-muted-foreground mr-1">🎯</span>
          <span className="text-muted-foreground">Top:</span>
          <span className="font-medium ml-1">{topAttack.attack}</span>
          <span className="text-muted-foreground ml-1">({topPercent}%)</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Attack Breakdown</h4>
          <div className="space-y-2">
            {data
              .sort((a, b) => b.count - a.count)
              .map((item) => {
                const percent = total > 0 ? Math.round((item.count / total) * 100) : 0
                const color = ATTACK_COLORS[item.attack as AttackType] || '#6b7280'

                return (
                  <div key={item.attack} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span>{item.attack}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{item.count}</span>
                      <span className="text-muted-foreground text-xs">({percent}%)</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => onFilter('Attack', item.attack)}
                      >
                        Filter
                      </Button>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

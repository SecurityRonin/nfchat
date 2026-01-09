import { useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { Loader2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { PROTOCOL_NAMES, ATTACK_COLORS, type AttackType } from '@/lib/schema'
import type { FlowRecord } from '@/lib/schema'

interface FlowTableProps {
  data: Partial<FlowRecord>[]
  loading?: boolean
  onRowClick?: (flow: Partial<FlowRecord>) => void
  selectedIndex?: number
  totalCount?: number
}

export function FlowTable({
  data,
  loading = false,
  onRowClick,
  selectedIndex,
  totalCount,
}: FlowTableProps) {
  const columns = useMemo<ColumnDef<Partial<FlowRecord>>[]>(
    () => [
      {
        accessorKey: 'IPV4_SRC_ADDR',
        header: 'Src IP',
        cell: ({ getValue }) => (
          <span className="font-mono text-xs">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'L4_SRC_PORT',
        header: 'Src Port',
        cell: ({ getValue }) => (
          <span className="font-mono text-xs">{getValue<number>()}</span>
        ),
      },
      {
        accessorKey: 'IPV4_DST_ADDR',
        header: 'Dst IP',
        cell: ({ getValue }) => (
          <span className="font-mono text-xs">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'L4_DST_PORT',
        header: 'Dst Port',
        cell: ({ getValue }) => (
          <span className="font-mono text-xs">{getValue<number>()}</span>
        ),
      },
      {
        accessorKey: 'PROTOCOL',
        header: 'Proto',
        cell: ({ getValue }) => {
          const proto = getValue<number>()
          return (
            <span className="text-xs">
              {PROTOCOL_NAMES[proto] || proto}
            </span>
          )
        },
      },
      {
        accessorKey: 'IN_BYTES',
        header: 'In Bytes',
        cell: ({ getValue }) => (
          <span className="text-xs">{getValue<number>()?.toLocaleString()}</span>
        ),
      },
      {
        accessorKey: 'OUT_BYTES',
        header: 'Out Bytes',
        cell: ({ getValue }) => (
          <span className="text-xs">{getValue<number>()?.toLocaleString()}</span>
        ),
      },
      {
        accessorKey: 'Attack',
        header: 'Attack',
        cell: ({ getValue }) => {
          const attack = getValue<string>()
          const color = ATTACK_COLORS[attack as AttackType] || '#6b7280'
          return (
            <Badge
              variant="outline"
              style={{ borderColor: color, color }}
              className="text-xs"
            >
              {attack}
            </Badge>
          )
        },
      },
    ],
    []
  )

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (loading) {
    return (
      <div
        data-testid="flow-table-loading"
        className="flex items-center justify-center h-full"
      >
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div
        data-testid="flow-table"
        className="flex items-center justify-center h-full text-muted-foreground text-sm"
      >
        No flows to display
      </div>
    )
  }

  return (
    <div data-testid="flow-table" className="h-full flex flex-col">
      {totalCount !== undefined && (
        <div className="text-xs text-muted-foreground mb-2">
          Showing {data.length.toLocaleString()} of {totalCount.toLocaleString()} flows
        </div>
      )}
      <ScrollArea className="flex-1">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-xs">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row, index) => (
              <TableRow
                key={row.id}
                className={`cursor-pointer hover:bg-muted/50 ${
                  selectedIndex === index ? 'selected bg-primary/10' : ''
                }`}
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="py-1">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  )
}

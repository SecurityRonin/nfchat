/**
 * FlowTable Column Definitions
 *
 * TanStack Table column configuration.
 */

import type { ColumnDef } from '@tanstack/react-table';
import type { FlowRecord } from '@/lib/schema';
import { MonoCell, NumericCell, ProtocolCell, AttackBadge } from './cells';

export function createFlowColumns(): ColumnDef<Partial<FlowRecord>>[] {
  return [
    {
      accessorKey: 'IPV4_SRC_ADDR',
      header: 'Src IP',
      cell: ({ getValue }) => <MonoCell value={getValue<string>()} />,
    },
    {
      accessorKey: 'L4_SRC_PORT',
      header: 'Src Port',
      cell: ({ getValue }) => <MonoCell value={getValue<number>()} />,
    },
    {
      accessorKey: 'IPV4_DST_ADDR',
      header: 'Dst IP',
      cell: ({ getValue }) => <MonoCell value={getValue<string>()} />,
    },
    {
      accessorKey: 'L4_DST_PORT',
      header: 'Dst Port',
      cell: ({ getValue }) => <MonoCell value={getValue<number>()} />,
    },
    {
      accessorKey: 'PROTOCOL',
      header: 'Proto',
      cell: ({ getValue }) => <ProtocolCell value={getValue<number>()} />,
    },
    {
      accessorKey: 'IN_BYTES',
      header: 'In Bytes',
      cell: ({ getValue }) => <NumericCell value={getValue<number>()} />,
    },
    {
      accessorKey: 'OUT_BYTES',
      header: 'Out Bytes',
      cell: ({ getValue }) => <NumericCell value={getValue<number>()} />,
    },
    {
      accessorKey: 'Attack',
      header: 'Attack',
      cell: ({ getValue }) => <AttackBadge value={getValue<string>()} />,
      filterFn: (row, columnId, filterValue: string[]) => {
        if (!filterValue || filterValue.length === 0) return true;
        const cellValue = row.getValue(columnId) as string;
        return filterValue.includes(cellValue);
      },
    },
  ];
}

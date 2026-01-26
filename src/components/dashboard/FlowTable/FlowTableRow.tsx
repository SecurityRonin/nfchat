/**
 * FlowTable Row Component
 *
 * Memoized virtual row for performance.
 */

import { memo } from 'react';
import { flexRender, type Row } from '@tanstack/react-table';
import { TableRow, TableCell } from '@/components/ui/table';
import type { FlowRecord } from '@/lib/schema';

interface VirtualRowProps {
  row: Row<Partial<FlowRecord>>;
  virtualRow: { index: number; start: number; size: number };
  measureElement: (el: HTMLTableRowElement | null) => void;
  isSelected: boolean;
  onClick: () => void;
  onCellClick?: (column: string, value: string) => void;
}

export const VirtualRow = memo(function VirtualRow({
  row,
  virtualRow,
  measureElement,
  isSelected,
  onClick,
  onCellClick,
}: VirtualRowProps) {
  return (
    <TableRow
      data-index={virtualRow.index}
      ref={measureElement}
      className={`cursor-pointer hover:bg-muted/50 ${
        isSelected ? 'selected bg-primary/10' : ''
      }`}
      onClick={onClick}
    >
      {row.getVisibleCells().map((cell) => {
        const columnId = cell.column.id;
        const rawValue = cell.getValue();
        const stringValue = rawValue != null ? String(rawValue) : '';

        const handleCellClick = onCellClick
          ? (e: React.MouseEvent) => {
              e.stopPropagation();
              onCellClick(columnId, stringValue);
            }
          : undefined;

        return (
          <TableCell key={cell.id} className="py-1">
            <span
              onClick={handleCellClick}
              className={onCellClick ? 'cursor-pointer hover:underline' : ''}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </span>
          </TableCell>
        );
      })}
    </TableRow>
  );
});

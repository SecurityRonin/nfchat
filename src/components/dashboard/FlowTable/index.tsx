/**
 * FlowTable Component
 *
 * Virtualized table for displaying network flow records.
 */

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { Loader2, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ATTACK_TYPES, ATTACK_COLORS } from '@/lib/schema';
import { MultiSelectFilter, type FilterOption } from '../MultiSelectFilter';
import type { FlowRecord } from '@/lib/schema';

import { createFlowColumns } from './columns';
import { VirtualRow } from './FlowTableRow';
import { FlowTablePagination } from './FlowTablePagination';
import type { FlowTableProps } from './types';

// Attack filter options with colors
const ATTACK_FILTER_OPTIONS: FilterOption[] = ATTACK_TYPES.map((attack) => ({
  value: attack,
  label: attack,
  color: ATTACK_COLORS[attack],
}));

export function FlowTable({
  data,
  loading = false,
  error = null,
  onRetry,
  onRowClick,
  onCellClick,
  selectedIndex,
  totalCount,
  currentPage,
  totalPages,
  onPageChange,
  columnFilters: controlledColumnFilters,
  onColumnFiltersChange,
}: FlowTableProps) {
  // Check if pagination is enabled
  const hasPagination =
    currentPage !== undefined &&
    totalPages !== undefined &&
    onPageChange !== undefined;
  // Check if column filters are controlled externally (server-side filtering)
  const isControlled =
    controlledColumnFilters !== undefined &&
    onColumnFiltersChange !== undefined;

  // All hooks must be called unconditionally at the top
  const parentRef = useRef<HTMLDivElement>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [internalColumnFilters, setInternalColumnFilters] =
    useState<ColumnFiltersState>([]);

  // Use controlled or internal state
  const columnFilters = isControlled
    ? controlledColumnFilters
    : internalColumnFilters;
  const setColumnFilters = isControlled
    ? onColumnFiltersChange
    : setInternalColumnFilters;

  const columns = useMemo(() => createFlowColumns(), []);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
  });

  const { rows } = table.getRowModel();

  // Reset pagination to page 0 when filters change (uncontrolled mode only)
  useEffect(() => {
    if (
      !isControlled &&
      currentPage !== undefined &&
      currentPage > 0 &&
      onPageChange
    ) {
      onPageChange(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [internalColumnFilters, isControlled]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35,
    overscan: 10,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  const handleRowClick = useCallback(
    (flow: Partial<FlowRecord>) => {
      onRowClick?.(flow);
    },
    [onRowClick]
  );

  // Early returns after all hooks
  if (error) {
    return (
      <div
        data-testid="flow-table-error"
        className="flex flex-col items-center justify-center h-full gap-4 p-4"
      >
        <div className="text-destructive text-sm text-center max-w-md">
          <span className="font-medium">Failed to load flows:</span>
          <br />
          {error}
        </div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try Again
          </Button>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div
        data-testid="flow-table-loading"
        className="flex items-center justify-center h-full"
      >
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        data-testid="flow-table"
        className="flex items-center justify-center h-full text-muted-foreground text-sm"
      >
        No flows to display
      </div>
    );
  }

  return (
    <div data-testid="flow-table" className="h-full flex flex-col">
      {totalCount !== undefined && (
        <div className="text-xs text-muted-foreground mb-2">
          Showing {data.length.toLocaleString()} of{' '}
          {totalCount.toLocaleString()} flows
        </div>
      )}
      <div ref={parentRef} data-virtualized className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isSorted = header.column.getIsSorted();
                  return (
                    <TableHead
                      key={header.id}
                      className="text-xs cursor-pointer select-none hover:bg-muted/50"
                      onClick={header.column.getToggleSortingHandler()}
                      aria-sort={
                        isSorted
                          ? isSorted === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : undefined
                      }
                    >
                      <div className="flex items-center gap-1">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                        {isSorted ? (
                          <span data-sort-indicator>
                            {isSorted === 'asc' ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )}
                          </span>
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-30" />
                        )}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
            {/* Filter row */}
            <TableRow>
              {table.getHeaderGroups()[0]?.headers.map((header) => (
                <TableHead key={`filter-${header.id}`} className="py-1 px-2">
                  {header.id === 'Attack' ? (
                    <MultiSelectFilter
                      options={ATTACK_FILTER_OPTIONS}
                      selected={
                        (header.column.getFilterValue() as string[]) ?? []
                      }
                      onChange={(values) =>
                        header.column.setFilterValue(
                          values.length > 0 ? values : undefined
                        )
                      }
                      placeholder="Filter..."
                    />
                  ) : (
                    <input
                      type="text"
                      placeholder="Filter..."
                      value={(header.column.getFilterValue() as string) ?? ''}
                      onChange={(e) =>
                        header.column.setFilterValue(e.target.value)
                      }
                      className="w-full text-xs px-1.5 py-0.5 border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Spacer for virtual scroll */}
            <tr style={{ height: `${virtualRows[0]?.start ?? 0}px` }} />
            {virtualRows.map((virtualRow) => {
              const row = rows[virtualRow.index];
              return (
                <VirtualRow
                  key={row.id}
                  row={row}
                  virtualRow={virtualRow}
                  measureElement={(el) => virtualizer.measureElement(el)}
                  isSelected={selectedIndex === virtualRow.index}
                  onClick={() => handleRowClick(row.original)}
                  onCellClick={onCellClick}
                />
              );
            })}
            {/* Bottom spacer */}
            <tr
              style={{
                height: `${totalSize - (virtualRows[virtualRows.length - 1]?.end ?? 0)}px`,
              }}
            />
          </TableBody>
        </Table>
      </div>
      {/* Pagination controls */}
      {hasPagination && (
        <FlowTablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}

// Re-export types for backwards compatibility
export type { FlowTableProps } from './types';

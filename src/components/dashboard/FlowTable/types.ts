/**
 * FlowTable Type Definitions
 */

import type { ColumnFiltersState, OnChangeFn } from '@tanstack/react-table';
import type { FlowRecord } from '@/lib/schema';

export interface FlowTableProps {
  data: Partial<FlowRecord>[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onRowClick?: (flow: Partial<FlowRecord>) => void;
  onCellClick?: (column: string, value: string) => void;
  selectedIndex?: number;
  totalCount?: number;
  // Pagination props
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  // Controlled column filters for server-side filtering
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;
}

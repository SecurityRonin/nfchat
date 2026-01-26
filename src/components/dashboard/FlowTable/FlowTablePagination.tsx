/**
 * FlowTable Pagination Controls
 */

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FlowTablePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function FlowTablePagination({
  currentPage,
  totalPages,
  onPageChange,
}: FlowTablePaginationProps) {
  return (
    <div
      data-testid="pagination-controls"
      className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30"
    >
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 0}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Prev
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {currentPage + 1} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages - 1}
        aria-label="Next page"
      >
        Next
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}

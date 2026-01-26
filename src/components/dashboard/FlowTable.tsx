/**
 * FlowTable - Backwards Compatibility Re-export
 *
 * The FlowTable component has been decomposed into modular files under FlowTable/.
 * This file re-exports the public API for backwards compatibility.
 *
 * Modular structure:
 * - FlowTable/index.tsx      - Main component
 * - FlowTable/types.ts       - Type definitions
 * - FlowTable/columns.tsx    - Column definitions
 * - FlowTable/cells.tsx      - Cell renderers
 * - FlowTable/FlowTableRow.tsx       - Virtualized row
 * - FlowTable/FlowTablePagination.tsx - Pagination controls
 */

export { FlowTable } from './FlowTable/index';
export type { FlowTableProps } from './FlowTable/types';

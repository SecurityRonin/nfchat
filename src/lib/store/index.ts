import { create } from 'zustand';
import { createFilterSlice, initialFilterState } from './filterSlice';
import { createPaginationSlice } from './paginationSlice';
import { createChatSlice } from './chatSlice';
import { createDataSlice } from './dataSlice';
import { createUISlice } from './uiSlice';
import { buildWhereClause, selectFilteredFlows } from './selectors';
import type { AppState } from './types';

// Re-export types for backwards compatibility
export type {
  AppState,
  FilterState,
  ChatMessage,
  AttackBreakdownData,
  TopTalkerData,
} from './types';

// Re-export selectors
export { buildWhereClause, selectFilteredFlows };

// Re-export initial state for tests
export { initialFilterState };

// Create the composed store
export const useStore = create<AppState>()((...args) => ({
  ...createFilterSlice(...args),
  ...createPaginationSlice(...args),
  ...createChatSlice(...args),
  ...createDataSlice(...args),
  ...createUISlice(...args),
}));

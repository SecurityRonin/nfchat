import type { StateCreator } from 'zustand';
import type { PaginationSlice, DataSlice } from './types';

// Pagination needs access to totalFlowCount for bounds checking
type PaginationDeps = Pick<DataSlice, 'totalFlowCount'>;

export const createPaginationSlice: StateCreator<
  PaginationSlice & PaginationDeps,
  [],
  [],
  PaginationSlice
> = (set, get) => ({
  currentPage: 0,
  pageSize: 50,

  setCurrentPage: (page: number) => set({ currentPage: page }),

  setPageSize: (size: number) => set({ pageSize: size, currentPage: 0 }),

  nextPage: () => {
    const { currentPage, totalPages } = get();
    const maxPage = totalPages() - 1;
    if (currentPage < maxPage) {
      set({ currentPage: currentPage + 1 });
    }
  },

  prevPage: () => {
    const { currentPage } = get();
    if (currentPage > 0) {
      set({ currentPage: currentPage - 1 });
    }
  },

  totalPages: () => {
    const { totalFlowCount, pageSize } = get();
    return Math.ceil(totalFlowCount / pageSize);
  },

  pageOffset: () => {
    const { currentPage, pageSize } = get();
    return currentPage * pageSize;
  },
});

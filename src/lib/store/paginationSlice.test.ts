import { describe, it, expect, beforeEach } from 'vitest';
import { createPaginationSlice } from './paginationSlice';
import { create, type StoreApi } from 'zustand';
import type { PaginationSlice, DataSlice } from './types';

// Pagination needs access to totalFlowCount from data slice
type TestSlice = PaginationSlice & Pick<DataSlice, 'totalFlowCount'>;

describe('paginationSlice', () => {
  let store: StoreApi<TestSlice>;

  beforeEach(() => {
    store = create<TestSlice>()((set, get, api) => ({
      ...createPaginationSlice(set, get, api),
      totalFlowCount: 0,
    }));
  });

  describe('initial state', () => {
    it('starts at page 0', () => {
      expect(store.getState().currentPage).toBe(0);
    });

    it('has default page size of 50', () => {
      expect(store.getState().pageSize).toBe(50);
    });
  });

  describe('setCurrentPage', () => {
    it('sets current page', () => {
      store.getState().setCurrentPage(5);
      expect(store.getState().currentPage).toBe(5);
    });
  });

  describe('setPageSize', () => {
    it('sets page size', () => {
      store.getState().setPageSize(100);
      expect(store.getState().pageSize).toBe(100);
    });

    it('resets to page 0 when page size changes', () => {
      store.getState().setCurrentPage(10);
      store.getState().setPageSize(100);
      expect(store.getState().currentPage).toBe(0);
    });
  });

  describe('nextPage', () => {
    it('increments page', () => {
      store.setState({ totalFlowCount: 1000 });
      store.getState().nextPage();
      expect(store.getState().currentPage).toBe(1);
    });

    it('does not exceed max page', () => {
      store.setState({ totalFlowCount: 100, pageSize: 50, currentPage: 1 });
      store.getState().nextPage();
      expect(store.getState().currentPage).toBe(1); // max is 1 (0-indexed)
    });
  });

  describe('prevPage', () => {
    it('decrements page', () => {
      store.getState().setCurrentPage(5);
      store.getState().prevPage();
      expect(store.getState().currentPage).toBe(4);
    });

    it('does not go below 0', () => {
      store.getState().prevPage();
      expect(store.getState().currentPage).toBe(0);
    });
  });

  describe('totalPages', () => {
    it('computes total pages correctly', () => {
      store.setState({ totalFlowCount: 2365425, pageSize: 50 });
      expect(store.getState().totalPages()).toBe(47309);
    });

    it('handles exact division', () => {
      store.setState({ totalFlowCount: 100, pageSize: 50 });
      expect(store.getState().totalPages()).toBe(2);
    });

    it('handles zero items', () => {
      store.setState({ totalFlowCount: 0, pageSize: 50 });
      expect(store.getState().totalPages()).toBe(0);
    });
  });

  describe('pageOffset', () => {
    it('computes offset for current page', () => {
      store.setState({ currentPage: 3, pageSize: 50 });
      expect(store.getState().pageOffset()).toBe(150);
    });

    it('returns 0 for first page', () => {
      expect(store.getState().pageOffset()).toBe(0);
    });
  });
});

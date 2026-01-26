import { describe, it, expect, beforeEach } from 'vitest';
import { createUISlice } from './uiSlice';
import { create, type StoreApi } from 'zustand';
import type { UISlice } from './types';

describe('uiSlice', () => {
  let store: StoreApi<UISlice>;

  beforeEach(() => {
    store = create<UISlice>()(createUISlice);
  });

  describe('initial state', () => {
    it('hideBenign defaults to false', () => {
      expect(store.getState().hideBenign).toBe(false);
    });

    it('filteredFlows defaults to empty', () => {
      expect(store.getState().filteredFlows).toEqual([]);
    });
  });

  describe('toggleHideBenign', () => {
    it('toggles from false to true', () => {
      store.getState().toggleHideBenign();
      expect(store.getState().hideBenign).toBe(true);
    });

    it('toggles from true to false', () => {
      store.getState().toggleHideBenign();
      store.getState().toggleHideBenign();
      expect(store.getState().hideBenign).toBe(false);
    });
  });
});

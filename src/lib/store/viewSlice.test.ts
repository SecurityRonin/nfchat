import { describe, it, expect, beforeEach } from 'vitest';
import { createViewSlice } from './viewSlice';
import { create, type StoreApi } from 'zustand';
import type { ViewSlice } from './types';

describe('viewSlice', () => {
  let store: StoreApi<ViewSlice>;

  beforeEach(() => {
    store = create<ViewSlice>()(createViewSlice);
  });

  describe('initial state', () => {
    it('activeView defaults to dashboard', () => {
      expect(store.getState().activeView).toBe('dashboard');
    });
  });

  describe('setActiveView', () => {
    it('switches to stateExplorer', () => {
      store.getState().setActiveView('stateExplorer');
      expect(store.getState().activeView).toBe('stateExplorer');
    });

    it('switches back to dashboard', () => {
      store.getState().setActiveView('stateExplorer');
      store.getState().setActiveView('dashboard');
      expect(store.getState().activeView).toBe('dashboard');
    });
  });
});

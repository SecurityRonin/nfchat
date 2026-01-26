import { describe, it, expect, beforeEach } from 'vitest';
import { createMockStore, resetAllStores } from './mockStore';
import type { ChatMessage } from '@/lib/store';

describe('mockStore', () => {
  beforeEach(() => {
    resetAllStores();
  });

  describe('createMockStore', () => {
    it('creates a store with default state', () => {
      const store = createMockStore();

      expect(store.getState().hideBenign).toBe(false);
      expect(store.getState().messages).toEqual([]);
      expect(store.getState().isLoading).toBe(false);
      expect(store.getState().currentPage).toBe(0);
    });

    it('creates a store with custom initial state', () => {
      const store = createMockStore({
        hideBenign: true,
        currentPage: 5,
      });

      expect(store.getState().hideBenign).toBe(true);
      expect(store.getState().currentPage).toBe(5);
    });

    it('supports state updates', () => {
      const store = createMockStore();

      store.getState().toggleHideBenign();

      expect(store.getState().hideBenign).toBe(true);
    });

    it('supports adding messages', () => {
      const store = createMockStore();
      const message: Omit<ChatMessage, 'id' | 'timestamp'> = {
        role: 'user',
        content: 'Test message',
      };

      store.getState().addMessage(message);

      expect(store.getState().messages).toHaveLength(1);
      expect(store.getState().messages[0].content).toBe('Test message');
    });
  });

  describe('resetAllStores', () => {
    it('resets store to initial state', () => {
      const store = createMockStore();
      store.getState().toggleHideBenign();
      store.getState().setCurrentPage(10);

      resetAllStores();
      const freshStore = createMockStore();

      expect(freshStore.getState().hideBenign).toBe(false);
      expect(freshStore.getState().currentPage).toBe(0);
    });
  });
});

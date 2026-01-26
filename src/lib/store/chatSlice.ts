import type { StateCreator } from 'zustand';
import type { ChatSlice, ChatMessage } from './types';

export const createChatSlice: StateCreator<ChatSlice> = (set) => ({
  messages: [],
  isLoading: false,

  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: crypto.randomUUID(),
          timestamp: new Date(),
        },
      ],
    })),

  setIsLoading: (loading: boolean) => set({ isLoading: loading }),

  clearChat: () => set({ messages: [] }),
});

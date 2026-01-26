import type { StateCreator } from 'zustand';
import type { UISlice } from './types';

export const createUISlice: StateCreator<UISlice> = (set) => ({
  hideBenign: false,
  filteredFlows: [],

  toggleHideBenign: () => set((state) => ({ hideBenign: !state.hideBenign })),
});

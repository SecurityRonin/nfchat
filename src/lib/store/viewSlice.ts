import type { StateCreator } from 'zustand'
import type { ViewSlice } from './types'

export const createViewSlice: StateCreator<ViewSlice> = (set) => ({
  activeView: 'dashboard',
  selectedHmmState: null,

  setActiveView: (view) => set({ activeView: view }),
  setSelectedHmmState: (stateId) => set({ selectedHmmState: stateId }),
})

import type { StateCreator } from 'zustand'
import type { ViewSlice } from './types'

export const createViewSlice: StateCreator<ViewSlice> = (set) => ({
  activeView: 'dashboard',

  setActiveView: (view) => set({ activeView: view }),
})

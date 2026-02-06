import type { StateCreator } from 'zustand'
import type { HmmSlice } from './types'

export const createHmmSlice: StateCreator<HmmSlice> = (set) => ({
  hmmStates: [],
  hmmTraining: false,
  hmmProgress: 0,
  hmmError: null,
  tacticAssignments: {},
  expandedState: null,

  setHmmStates: (states) => set({ hmmStates: states }),
  setHmmTraining: (training) => set({ hmmTraining: training }),
  setHmmProgress: (progress) => set({ hmmProgress: progress }),
  setHmmError: (error) => set({ hmmError: error }),
  setTacticAssignment: (stateId, tactic) =>
    set((state) => ({
      tacticAssignments: { ...state.tacticAssignments, [stateId]: tactic },
    })),
  setExpandedState: (stateId) => set({ expandedState: stateId }),
  resetHmm: () =>
    set({
      hmmStates: [],
      hmmTraining: false,
      hmmProgress: 0,
      hmmError: null,
      tacticAssignments: {},
      expandedState: null,
    }),
})

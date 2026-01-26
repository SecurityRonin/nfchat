import type { StateCreator } from 'zustand';
import type { FlowRecord } from '../schema';
import type { DataSlice, AttackBreakdownData, TopTalkerData } from './types';

export const createDataSlice: StateCreator<DataSlice> = (set) => ({
  // Data loading state
  dataLoaded: false,
  dataLoading: false,
  dataError: null,
  totalRows: 0,

  // Dashboard data
  attackBreakdown: [],
  topSrcIPs: [],
  topDstIPs: [],
  flows: [],
  totalFlowCount: 0,
  selectedFlow: null,

  // Data loading actions
  setDataLoaded: (loaded: boolean) => set({ dataLoaded: loaded }),
  setDataLoading: (loading: boolean) => set({ dataLoading: loading }),
  setDataError: (error: string | null) => set({ dataError: error }),
  setTotalRows: (rows: number) => set({ totalRows: rows }),

  // Dashboard data actions
  setAttackBreakdown: (data: AttackBreakdownData[]) => set({ attackBreakdown: data }),
  setTopSrcIPs: (data: TopTalkerData[]) => set({ topSrcIPs: data }),
  setTopDstIPs: (data: TopTalkerData[]) => set({ topDstIPs: data }),
  setFlows: (flows: Partial<FlowRecord>[]) => set({ flows }),
  setTotalFlowCount: (count: number) => set({ totalFlowCount: count }),
  setSelectedFlow: (flow: Partial<FlowRecord> | null) => set({ selectedFlow: flow }),
});

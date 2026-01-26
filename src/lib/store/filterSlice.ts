import type { StateCreator } from 'zustand';
import type { AttackType } from '../schema';
import type { FilterSlice, FilterState } from './types';

export const initialFilterState: FilterState = {
  timeRange: { start: null, end: null },
  srcIps: [],
  dstIps: [],
  srcPorts: [],
  dstPorts: [],
  protocols: [],
  l7Protocols: [],
  attackTypes: [],
  customFilter: null,
  resultCount: null,
};

export const createFilterSlice: StateCreator<FilterSlice> = (set) => ({
  ...initialFilterState,

  setTimeRange: (start: number | null, end: number | null) =>
    set({ timeRange: { start, end } }),

  addSrcIp: (ip: string) =>
    set((state) => ({
      srcIps: state.srcIps.includes(ip) ? state.srcIps : [...state.srcIps, ip],
    })),

  removeSrcIp: (ip: string) =>
    set((state) => ({
      srcIps: state.srcIps.filter((i) => i !== ip),
    })),

  addDstIp: (ip: string) =>
    set((state) => ({
      dstIps: state.dstIps.includes(ip) ? state.dstIps : [...state.dstIps, ip],
    })),

  removeDstIp: (ip: string) =>
    set((state) => ({
      dstIps: state.dstIps.filter((i) => i !== ip),
    })),

  setAttackTypes: (types: AttackType[]) => set({ attackTypes: types }),

  toggleAttackType: (type: AttackType) =>
    set((state) => ({
      attackTypes: state.attackTypes.includes(type)
        ? state.attackTypes.filter((t) => t !== type)
        : [...state.attackTypes, type],
    })),

  setCustomFilter: (filter: string | null) => set({ customFilter: filter }),

  setResultCount: (count: number | null) => set({ resultCount: count }),

  clearFilters: () => set(initialFilterState),
});

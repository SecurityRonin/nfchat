import { create, type StoreApi } from 'zustand';
import type { AppState, ChatMessage, AttackBreakdownData, TopTalkerData } from '@/lib/store';
import type { FlowRecord } from '@/lib/schema';
import type { AttackType } from '@/lib/schema';

// Track all created stores for reset
const stores: StoreApi<AppState>[] = [];

/**
 * Initial state for the mock store.
 */
const initialMockState: Partial<AppState> = {
  // Pagination
  currentPage: 0,
  pageSize: 50,

  // Filters
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

  // Chat
  messages: [],
  isLoading: false,

  // Data loading
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

  // Quick filter
  hideBenign: false,
  filteredFlows: [],
};

/**
 * Create a mock store with optional initial state overrides.
 */
export function createMockStore(
  overrides: Partial<AppState> = {}
): StoreApi<AppState> {
  const store = create<AppState>((set, get) => ({
    // Merge defaults with overrides
    ...initialMockState,
    ...overrides,

    // Pagination actions
    setCurrentPage: (page: number) => set({ currentPage: page }),
    setPageSize: (size: number) => set({ pageSize: size, currentPage: 0 }),
    nextPage: () => {
      const { currentPage } = get();
      set({ currentPage: currentPage + 1 });
    },
    prevPage: () => {
      const { currentPage } = get();
      if (currentPage > 0) {
        set({ currentPage: currentPage - 1 });
      }
    },
    totalPages: () => {
      const { totalFlowCount, pageSize } = get();
      return Math.ceil(totalFlowCount / pageSize);
    },
    pageOffset: () => {
      const { currentPage, pageSize } = get();
      return currentPage * pageSize;
    },

    // Filter actions
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
    clearFilters: () =>
      set({
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
      }),

    // Chat actions
    addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) =>
      set((state) => ({
        messages: [
          ...state.messages,
          {
            ...message,
            id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            timestamp: new Date(),
          },
        ],
      })),
    setIsLoading: (loading: boolean) => set({ isLoading: loading }),
    clearChat: () => set({ messages: [] }),

    // Data loading actions
    setDataLoaded: (loaded: boolean) => set({ dataLoaded: loaded }),
    setDataLoading: (loading: boolean) => set({ dataLoading: loading }),
    setDataError: (error: string | null) => set({ dataError: error }),
    setTotalRows: (rows: number) => set({ totalRows: rows }),

    // Dashboard data actions
    setAttackBreakdown: (data: AttackBreakdownData[]) => set({ attackBreakdown: data }),
    setTopSrcIPs: (data: TopTalkerData[]) => set({ topSrcIPs: data }),
    setTopDstIPs: (data: TopTalkerData[]) => set({ topDstIPs: data }),
    setFlows: (flows: Partial<FlowRecord>[]) => set({ flows, filteredFlows: flows }),
    setTotalFlowCount: (count: number) => set({ totalFlowCount: count }),
    setSelectedFlow: (flow: Partial<FlowRecord> | null) => set({ selectedFlow: flow }),

    // Quick filter
    toggleHideBenign: () => set((state) => ({ hideBenign: !state.hideBenign })),
  } as AppState));

  stores.push(store);
  return store;
}

/**
 * Reset all created mock stores to initial state.
 */
export function resetAllStores(): void {
  stores.length = 0;
}

/**
 * Create a store with pre-populated test data.
 */
export function createPopulatedStore(
  flows: Partial<FlowRecord>[],
  overrides: Partial<AppState> = {}
): StoreApi<AppState> {
  return createMockStore({
    flows,
    filteredFlows: flows,
    totalFlowCount: flows.length,
    dataLoaded: true,
    ...overrides,
  });
}

import { describe, it, expect, beforeEach } from 'vitest';
import { createDataSlice } from './dataSlice';
import { create, type StoreApi } from 'zustand';
import type { DataSlice } from './types';

describe('dataSlice', () => {
  let store: StoreApi<DataSlice>;

  beforeEach(() => {
    store = create<DataSlice>()(createDataSlice);
  });

  describe('initial state', () => {
    it('data is not loaded', () => {
      expect(store.getState().dataLoaded).toBe(false);
    });

    it('data is not loading', () => {
      expect(store.getState().dataLoading).toBe(false);
    });

    it('no data error', () => {
      expect(store.getState().dataError).toBeNull();
    });

    it('zero total rows', () => {
      expect(store.getState().totalRows).toBe(0);
    });

    it('empty attack breakdown', () => {
      expect(store.getState().attackBreakdown).toEqual([]);
    });

    it('empty top talkers', () => {
      expect(store.getState().topSrcIPs).toEqual([]);
      expect(store.getState().topDstIPs).toEqual([]);
    });

    it('empty flows', () => {
      expect(store.getState().flows).toEqual([]);
    });

    it('zero total flow count', () => {
      expect(store.getState().totalFlowCount).toBe(0);
    });

    it('no selected flow', () => {
      expect(store.getState().selectedFlow).toBeNull();
    });
  });

  describe('data loading state', () => {
    it('sets data loaded', () => {
      store.getState().setDataLoaded(true);
      expect(store.getState().dataLoaded).toBe(true);
    });

    it('sets data loading', () => {
      store.getState().setDataLoading(true);
      expect(store.getState().dataLoading).toBe(true);
    });

    it('sets data error', () => {
      store.getState().setDataError('Connection failed');
      expect(store.getState().dataError).toBe('Connection failed');
    });

    it('clears data error', () => {
      store.getState().setDataError('Error');
      store.getState().setDataError(null);
      expect(store.getState().dataError).toBeNull();
    });

    it('sets total rows', () => {
      store.getState().setTotalRows(2365425);
      expect(store.getState().totalRows).toBe(2365425);
    });
  });

  describe('dashboard data', () => {
    it('sets attack breakdown', () => {
      const breakdown = [
        { attack: 'Exploits', count: 100 },
        { attack: 'Backdoor', count: 50 },
      ];
      store.getState().setAttackBreakdown(breakdown);
      expect(store.getState().attackBreakdown).toEqual(breakdown);
    });

    it('sets top source IPs', () => {
      const topIPs = [
        { ip: '192.168.1.1', value: 1000 },
        { ip: '192.168.1.2', value: 500 },
      ];
      store.getState().setTopSrcIPs(topIPs);
      expect(store.getState().topSrcIPs).toEqual(topIPs);
    });

    it('sets top destination IPs', () => {
      const topIPs = [{ ip: '10.0.0.1', value: 2000 }];
      store.getState().setTopDstIPs(topIPs);
      expect(store.getState().topDstIPs).toEqual(topIPs);
    });

    it('sets flows', () => {
      const flows = [
        { IPV4_SRC_ADDR: '1.1.1.1', Attack: 'Exploits' },
        { IPV4_SRC_ADDR: '2.2.2.2', Attack: 'Benign' },
      ];
      store.getState().setFlows(flows);
      expect(store.getState().flows).toEqual(flows);
    });

    it('sets total flow count', () => {
      store.getState().setTotalFlowCount(10000);
      expect(store.getState().totalFlowCount).toBe(10000);
    });

    it('sets selected flow', () => {
      const flow = { IPV4_SRC_ADDR: '1.1.1.1', Attack: 'Exploits' };
      store.getState().setSelectedFlow(flow);
      expect(store.getState().selectedFlow).toEqual(flow);
    });

    it('clears selected flow', () => {
      store.getState().setSelectedFlow({ IPV4_SRC_ADDR: '1.1.1.1' });
      store.getState().setSelectedFlow(null);
      expect(store.getState().selectedFlow).toBeNull();
    });
  });
});

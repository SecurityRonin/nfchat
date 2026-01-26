import { describe, it, expect, beforeEach } from 'vitest';
import { createFilterSlice, initialFilterState } from './filterSlice';
import { create, type StoreApi } from 'zustand';
import type { FilterSlice } from './types';

describe('filterSlice', () => {
  let store: StoreApi<FilterSlice>;

  beforeEach(() => {
    store = create<FilterSlice>()(createFilterSlice);
  });

  describe('initial state', () => {
    it('has empty time range', () => {
      expect(store.getState().timeRange).toEqual({ start: null, end: null });
    });

    it('has empty IP arrays', () => {
      expect(store.getState().srcIps).toEqual([]);
      expect(store.getState().dstIps).toEqual([]);
    });

    it('has empty port arrays', () => {
      expect(store.getState().srcPorts).toEqual([]);
      expect(store.getState().dstPorts).toEqual([]);
    });

    it('has empty protocol arrays', () => {
      expect(store.getState().protocols).toEqual([]);
      expect(store.getState().l7Protocols).toEqual([]);
    });

    it('has empty attack types', () => {
      expect(store.getState().attackTypes).toEqual([]);
    });

    it('has null custom filter', () => {
      expect(store.getState().customFilter).toBeNull();
    });

    it('has null result count', () => {
      expect(store.getState().resultCount).toBeNull();
    });
  });

  describe('setTimeRange', () => {
    it('sets both start and end', () => {
      store.getState().setTimeRange(1000, 2000);
      expect(store.getState().timeRange).toEqual({ start: 1000, end: 2000 });
    });

    it('sets only start', () => {
      store.getState().setTimeRange(1000, null);
      expect(store.getState().timeRange).toEqual({ start: 1000, end: null });
    });

    it('sets only end', () => {
      store.getState().setTimeRange(null, 2000);
      expect(store.getState().timeRange).toEqual({ start: null, end: 2000 });
    });
  });

  describe('source IP management', () => {
    it('adds source IP', () => {
      store.getState().addSrcIp('192.168.1.1');
      expect(store.getState().srcIps).toEqual(['192.168.1.1']);
    });

    it('does not add duplicate source IP', () => {
      store.getState().addSrcIp('192.168.1.1');
      store.getState().addSrcIp('192.168.1.1');
      expect(store.getState().srcIps).toEqual(['192.168.1.1']);
    });

    it('removes source IP', () => {
      store.getState().addSrcIp('192.168.1.1');
      store.getState().addSrcIp('192.168.1.2');
      store.getState().removeSrcIp('192.168.1.1');
      expect(store.getState().srcIps).toEqual(['192.168.1.2']);
    });
  });

  describe('destination IP management', () => {
    it('adds destination IP', () => {
      store.getState().addDstIp('10.0.0.1');
      expect(store.getState().dstIps).toEqual(['10.0.0.1']);
    });

    it('does not add duplicate destination IP', () => {
      store.getState().addDstIp('10.0.0.1');
      store.getState().addDstIp('10.0.0.1');
      expect(store.getState().dstIps).toEqual(['10.0.0.1']);
    });

    it('removes destination IP', () => {
      store.getState().addDstIp('10.0.0.1');
      store.getState().addDstIp('10.0.0.2');
      store.getState().removeDstIp('10.0.0.1');
      expect(store.getState().dstIps).toEqual(['10.0.0.2']);
    });
  });

  describe('attack type management', () => {
    it('sets attack types', () => {
      store.getState().setAttackTypes(['Exploits', 'Backdoor']);
      expect(store.getState().attackTypes).toEqual(['Exploits', 'Backdoor']);
    });

    it('toggles attack type on', () => {
      store.getState().toggleAttackType('Exploits');
      expect(store.getState().attackTypes).toContain('Exploits');
    });

    it('toggles attack type off', () => {
      store.getState().setAttackTypes(['Exploits', 'Backdoor']);
      store.getState().toggleAttackType('Exploits');
      expect(store.getState().attackTypes).toEqual(['Backdoor']);
    });
  });

  describe('custom filter', () => {
    it('sets custom filter', () => {
      store.getState().setCustomFilter('IN_BYTES > 1024');
      expect(store.getState().customFilter).toBe('IN_BYTES > 1024');
    });

    it('clears custom filter', () => {
      store.getState().setCustomFilter('IN_BYTES > 1024');
      store.getState().setCustomFilter(null);
      expect(store.getState().customFilter).toBeNull();
    });
  });

  describe('result count', () => {
    it('sets result count', () => {
      store.getState().setResultCount(100);
      expect(store.getState().resultCount).toBe(100);
    });

    it('clears result count', () => {
      store.getState().setResultCount(100);
      store.getState().setResultCount(null);
      expect(store.getState().resultCount).toBeNull();
    });
  });

  describe('clearFilters', () => {
    it('resets all filters to initial state', () => {
      // Set various filters
      store.getState().setTimeRange(1000, 2000);
      store.getState().addSrcIp('192.168.1.1');
      store.getState().addDstIp('10.0.0.1');
      store.getState().setAttackTypes(['Exploits']);
      store.getState().setCustomFilter('test');
      store.getState().setResultCount(50);

      // Clear all
      store.getState().clearFilters();

      // Verify reset
      const state = store.getState();
      expect(state.timeRange).toEqual({ start: null, end: null });
      expect(state.srcIps).toEqual([]);
      expect(state.dstIps).toEqual([]);
      expect(state.attackTypes).toEqual([]);
      expect(state.customFilter).toBeNull();
      expect(state.resultCount).toBeNull();
    });
  });

  describe('initialFilterState export', () => {
    it('provides correct initial state', () => {
      expect(initialFilterState).toEqual({
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
      });
    });
  });
});

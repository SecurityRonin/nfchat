import { describe, it, expect } from 'vitest';
import { buildWhereClause, selectFilteredFlows } from './selectors';
import type { FilterState, AppState } from './types';

describe('buildWhereClause', () => {
  const emptyFilters: FilterState = {
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

  it('returns 1=1 when no filters are set', () => {
    expect(buildWhereClause(emptyFilters)).toBe('1=1');
  });

  it('filters by time range start', () => {
    const filters = { ...emptyFilters, timeRange: { start: 1424242190000, end: null } };
    expect(buildWhereClause(filters)).toBe('FLOW_START_MILLISECONDS >= 1424242190000');
  });

  it('filters by time range end', () => {
    const filters = { ...emptyFilters, timeRange: { start: null, end: 1424242200000 } };
    expect(buildWhereClause(filters)).toBe('FLOW_END_MILLISECONDS <= 1424242200000');
  });

  it('filters by source IPs', () => {
    const filters = { ...emptyFilters, srcIps: ['59.166.0.2', '59.166.0.4'] };
    expect(buildWhereClause(filters)).toBe("IPV4_SRC_ADDR IN ('59.166.0.2', '59.166.0.4')");
  });

  it('filters by destination IPs', () => {
    const filters = { ...emptyFilters, dstIps: ['149.171.126.3'] };
    expect(buildWhereClause(filters)).toBe("IPV4_DST_ADDR IN ('149.171.126.3')");
  });

  it('filters by attack types', () => {
    const filters: FilterState = { ...emptyFilters, attackTypes: ['Exploits', 'Reconnaissance'] };
    expect(buildWhereClause(filters)).toBe("Attack IN ('Exploits', 'Reconnaissance')");
  });

  it('filters by protocols', () => {
    const filters = { ...emptyFilters, protocols: [6, 17] };
    expect(buildWhereClause(filters)).toBe('PROTOCOL IN (6, 17)');
  });

  it('filters by L7 protocols', () => {
    const filters = { ...emptyFilters, l7Protocols: [5, 7] };
    expect(buildWhereClause(filters)).toBe('L7_PROTO IN (5, 7)');
  });

  it('wraps custom filter in parentheses', () => {
    const filters = { ...emptyFilters, customFilter: 'IN_BYTES > 1024 AND L7_PROTO = 5' };
    expect(buildWhereClause(filters)).toBe('(IN_BYTES > 1024 AND L7_PROTO = 5)');
  });

  it('combines multiple filters with AND', () => {
    const filters: FilterState = {
      ...emptyFilters,
      srcIps: ['59.166.0.2'],
      attackTypes: ['Exploits'],
      protocols: [6],
    };
    const result = buildWhereClause(filters);
    expect(result).toContain("IPV4_SRC_ADDR IN ('59.166.0.2')");
    expect(result).toContain("Attack IN ('Exploits')");
    expect(result).toContain('PROTOCOL IN (6)');
    expect(result.split(' AND ').length).toBe(3);
  });
});

describe('selectFilteredFlows', () => {
  const baseState = {
    flows: [],
    hideBenign: false,
  } as unknown as AppState;

  it('returns all flows when hideBenign is false', () => {
    const flows = [
      { Attack: 'Benign', IPV4_SRC_ADDR: '1.1.1.1' },
      { Attack: 'Backdoor', IPV4_SRC_ADDR: '2.2.2.2' },
    ];
    const state = { ...baseState, flows, hideBenign: false };
    expect(selectFilteredFlows(state)).toHaveLength(2);
  });

  it('filters out benign when hideBenign is true', () => {
    const flows = [
      { Attack: 'Benign', IPV4_SRC_ADDR: '1.1.1.1' },
      { Attack: 'Backdoor', IPV4_SRC_ADDR: '2.2.2.2' },
      { Attack: 'Benign', IPV4_SRC_ADDR: '3.3.3.3' },
      { Attack: 'Exploits', IPV4_SRC_ADDR: '4.4.4.4' },
    ];
    const state = { ...baseState, flows, hideBenign: true };
    const result = selectFilteredFlows(state);
    expect(result).toHaveLength(2);
    expect(result.every((f) => f.Attack !== 'Benign')).toBe(true);
  });

  it('limits to MAX_DISPLAY_ROWS', () => {
    const flows = Array.from({ length: 15000 }, (_, i) => ({
      Attack: 'Exploits',
      IPV4_SRC_ADDR: `192.168.${Math.floor(i / 256)}.${i % 256}`,
    }));
    const state = { ...baseState, flows, hideBenign: false };
    expect(selectFilteredFlows(state)).toHaveLength(10000);
  });
});

/**
 * Queries Module Tests
 */

import { describe, it, expect } from 'vitest';
import {
  parseFilterPattern,
  generateFallbackQueries,
  isGreeting,
} from './index';

describe('parseFilterPattern', () => {
  it('parses source IP filter', () => {
    const result = parseFilterPattern('Filter by source ip = 192.168.1.1');
    expect(result).toBe(
      "SELECT * FROM flows WHERE IPV4_SRC_ADDR = '192.168.1.1' LIMIT 1000"
    );
  });

  it('parses destination IP filter', () => {
    const result = parseFilterPattern('Filter by dst ip = 10.0.0.1');
    expect(result).toBe(
      "SELECT * FROM flows WHERE IPV4_DST_ADDR = '10.0.0.1' LIMIT 1000"
    );
  });

  it('parses numeric port filter', () => {
    const result = parseFilterPattern('Filter by src port = 443');
    expect(result).toBe(
      'SELECT * FROM flows WHERE L4_SRC_PORT = 443 LIMIT 1000'
    );
  });

  it('parses attack type filter', () => {
    const result = parseFilterPattern('Filter by attack = DoS');
    expect(result).toBe(
      "SELECT * FROM flows WHERE Attack = 'DoS' LIMIT 1000"
    );
  });

  it('handles case-insensitive labels', () => {
    const result = parseFilterPattern('filter by SOURCE IP = 192.168.1.1');
    expect(result).toBe(
      "SELECT * FROM flows WHERE IPV4_SRC_ADDR = '192.168.1.1' LIMIT 1000"
    );
  });

  it('returns null for non-filter patterns', () => {
    expect(parseFilterPattern('What attacks are there?')).toBeNull();
    expect(parseFilterPattern('Show me traffic')).toBeNull();
  });

  it('returns null for unknown columns', () => {
    expect(parseFilterPattern('Filter by unknown = value')).toBeNull();
  });

  it('escapes single quotes in values', () => {
    const result = parseFilterPattern("Filter by attack = O'Brien");
    expect(result).toBe(
      "SELECT * FROM flows WHERE Attack = 'O''Brien' LIMIT 1000"
    );
  });
});

describe('generateFallbackQueries', () => {
  it('generates attack query for attack-related questions', () => {
    const result = generateFallbackQueries('Show me the attacks');
    expect(result.queries.length).toBeGreaterThan(0);
    expect(result.queries[0]).toContain('Attack');
  });

  it('generates IP query for IP-related questions', () => {
    const result = generateFallbackQueries('What are the top source IPs?');
    expect(result.queries.some((q) => q.includes('IPV4_SRC_ADDR'))).toBe(true);
  });

  it('generates port query for port-related questions', () => {
    const result = generateFallbackQueries('Are there port scans?');
    expect(result.queries.some((q) => q.includes('L4_DST_PORT'))).toBe(true);
  });

  it('generates traffic query for volume questions', () => {
    const result = generateFallbackQueries('What is the traffic volume?');
    expect(result.queries.some((q) => q.includes('BYTES'))).toBe(true);
  });

  it('returns default query for unknown questions', () => {
    const result = generateFallbackQueries('random gibberish xyz');
    expect(result.queries.length).toBeGreaterThan(0);
  });
});

describe('isGreeting', () => {
  it('detects greetings', () => {
    expect(isGreeting('hi')).toBe(true);
    expect(isGreeting('Hello!')).toBe(true);
    expect(isGreeting('hey there')).toBe(true);
    expect(isGreeting('thanks')).toBe(true);
    expect(isGreeting('Thank you')).toBe(true);
    expect(isGreeting('bye')).toBe(true);
  });

  it('detects short questions as greetings', () => {
    expect(isGreeting('ok')).toBe(true);
    expect(isGreeting('yes')).toBe(true);
  });

  it('does not treat real questions as greetings', () => {
    expect(isGreeting('What attacks are there?')).toBe(false);
    expect(isGreeting('Show me source IPs')).toBe(false);
  });
});

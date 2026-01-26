import { describe, it, expect } from 'vitest';
import { flowFactory, buildFlows } from './flowFactory';

describe('flowFactory', () => {
  describe('build', () => {
    it('creates a flow record with default values', () => {
      const flow = flowFactory.build();

      expect(flow.IPV4_SRC_ADDR).toBeDefined();
      expect(flow.IPV4_DST_ADDR).toBeDefined();
      expect(flow.L4_SRC_PORT).toBeDefined();
      expect(flow.L4_DST_PORT).toBeDefined();
      expect(flow.PROTOCOL).toBeDefined();
      expect(flow.Attack).toBeDefined();
    });

    it('generates unique IDs for each flow', () => {
      const flow1 = flowFactory.build();
      const flow2 = flowFactory.build();

      expect(flow1.IPV4_SRC_ADDR).not.toBe(flow2.IPV4_SRC_ADDR);
    });

    it('allows overriding specific fields', () => {
      const flow = flowFactory.build({
        IPV4_SRC_ADDR: '192.168.1.100',
        L4_SRC_PORT: 443,
        Attack: 'Exploits',
      });

      expect(flow.IPV4_SRC_ADDR).toBe('192.168.1.100');
      expect(flow.L4_SRC_PORT).toBe(443);
      expect(flow.Attack).toBe('Exploits');
    });

    it('generates valid IP addresses', () => {
      const flow = flowFactory.build();
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;

      expect(flow.IPV4_SRC_ADDR).toMatch(ipRegex);
      expect(flow.IPV4_DST_ADDR).toMatch(ipRegex);
    });

    it('generates valid port numbers', () => {
      const flow = flowFactory.build();

      expect(flow.L4_SRC_PORT).toBeGreaterThanOrEqual(1);
      expect(flow.L4_SRC_PORT).toBeLessThanOrEqual(65535);
      expect(flow.L4_DST_PORT).toBeGreaterThanOrEqual(1);
      expect(flow.L4_DST_PORT).toBeLessThanOrEqual(65535);
    });
  });

  describe('traits', () => {
    it('creates benign flow with Benign trait', () => {
      const flow = flowFactory.build({ Attack: 'Benign' });

      expect(flow.Attack).toBe('Benign');
    });

    it('creates attack flow with specific attack type', () => {
      const flow = flowFactory.build({ Attack: 'DDoS' });

      expect(flow.Attack).toBe('DDoS');
    });
  });
});

describe('buildFlows', () => {
  it('creates multiple flows', () => {
    const flows = buildFlows(5);

    expect(flows).toHaveLength(5);
    flows.forEach((flow) => {
      expect(flow.IPV4_SRC_ADDR).toBeDefined();
    });
  });

  it('allows overriding all flows with same values', () => {
    const flows = buildFlows(3, { Attack: 'Reconnaissance' });

    flows.forEach((flow) => {
      expect(flow.Attack).toBe('Reconnaissance');
    });
  });

  it('generates unique flows', () => {
    const flows = buildFlows(3);
    const srcAddrs = flows.map((f) => f.IPV4_SRC_ADDR);
    const uniqueAddrs = new Set(srcAddrs);

    expect(uniqueAddrs.size).toBe(3);
  });
});

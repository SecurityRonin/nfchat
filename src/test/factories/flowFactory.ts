import type { FlowRecord } from '@/lib/schema';

// Counter for generating unique values
let counter = 0;

function nextId(): number {
  return ++counter;
}

function randomIp(): string {
  const id = nextId();
  return `10.0.${Math.floor(id / 256) % 256}.${id % 256}`;
}

function randomPort(): number {
  return 1024 + (nextId() % 64000);
}

function randomBytes(): number {
  return Math.floor(Math.random() * 10000) + 100;
}

function randomPackets(): number {
  return Math.floor(Math.random() * 100) + 1;
}

const now = Date.now();

/**
 * Factory for creating test FlowRecord objects.
 * Generates valid default values with ability to override specific fields.
 */
export const flowFactory = {
  /**
   * Build a single flow record with optional overrides.
   */
  build(overrides: Partial<FlowRecord> = {}): Partial<FlowRecord> {
    const id = nextId();
    const startTime = now - id * 1000;
    const duration = Math.floor(Math.random() * 5000) + 100;

    const defaults: Partial<FlowRecord> = {
      FLOW_START_MILLISECONDS: startTime,
      FLOW_END_MILLISECONDS: startTime + duration,
      IPV4_SRC_ADDR: randomIp(),
      L4_SRC_PORT: randomPort(),
      IPV4_DST_ADDR: randomIp(),
      L4_DST_PORT: randomPort(),
      PROTOCOL: 6, // TCP
      L7_PROTO: 0,
      IN_BYTES: randomBytes(),
      IN_PKTS: randomPackets(),
      OUT_BYTES: randomBytes(),
      OUT_PKTS: randomPackets(),
      TCP_FLAGS: 0,
      CLIENT_TCP_FLAGS: 0,
      SERVER_TCP_FLAGS: 0,
      FLOW_DURATION_MILLISECONDS: duration,
      DURATION_IN: Math.floor(duration / 2),
      DURATION_OUT: Math.floor(duration / 2),
      MIN_TTL: 64,
      MAX_TTL: 128,
      LONGEST_FLOW_PKT: 1500,
      SHORTEST_FLOW_PKT: 64,
      MIN_IP_PKT_LEN: 40,
      MAX_IP_PKT_LEN: 1500,
      SRC_TO_DST_SECOND_BYTES: randomBytes(),
      DST_TO_SRC_SECOND_BYTES: randomBytes(),
      RETRANSMITTED_IN_BYTES: 0,
      RETRANSMITTED_IN_PKTS: 0,
      RETRANSMITTED_OUT_BYTES: 0,
      RETRANSMITTED_OUT_PKTS: 0,
      SRC_TO_DST_AVG_THROUGHPUT: randomBytes(),
      DST_TO_SRC_AVG_THROUGHPUT: randomBytes(),
      NUM_PKTS_UP_TO_128_BYTES: randomPackets(),
      NUM_PKTS_128_TO_256_BYTES: randomPackets(),
      NUM_PKTS_256_TO_512_BYTES: randomPackets(),
      NUM_PKTS_512_TO_1024_BYTES: randomPackets(),
      NUM_PKTS_1024_TO_1514_BYTES: randomPackets(),
      TCP_WIN_MAX_IN: 65535,
      TCP_WIN_MAX_OUT: 65535,
      ICMP_TYPE: 0,
      ICMP_IPV4_TYPE: 0,
      DNS_QUERY_ID: 0,
      DNS_QUERY_TYPE: 0,
      DNS_TTL_ANSWER: 0,
      FTP_COMMAND_RET_CODE: 0,
      SRC_TO_DST_IAT_MIN: 0,
      SRC_TO_DST_IAT_MAX: 100,
      SRC_TO_DST_IAT_AVG: 50,
      SRC_TO_DST_IAT_STDDEV: 10,
      DST_TO_SRC_IAT_MIN: 0,
      DST_TO_SRC_IAT_MAX: 100,
      DST_TO_SRC_IAT_AVG: 50,
      DST_TO_SRC_IAT_STDDEV: 10,
      Label: 'Normal',
      Attack: 'Benign',
    };

    return { ...defaults, ...overrides };
  },

  /**
   * Reset the counter (useful between test suites).
   */
  reset(): void {
    counter = 0;
  },
};

/**
 * Build multiple flow records at once.
 */
export function buildFlows(
  count: number,
  overrides: Partial<FlowRecord> = {}
): Partial<FlowRecord>[] {
  return Array.from({ length: count }, () => flowFactory.build(overrides));
}

/**
 * Build a flow with attack characteristics.
 */
export function buildAttackFlow(
  attackType: string,
  overrides: Partial<FlowRecord> = {}
): Partial<FlowRecord> {
  return flowFactory.build({
    Attack: attackType,
    Label: attackType,
    ...overrides,
  });
}

/**
 * Build flows for common test scenarios.
 */
export const flowScenarios = {
  /**
   * Mix of benign and attack flows.
   */
  mixed(benignCount: number, attackCount: number): Partial<FlowRecord>[] {
    const benign = buildFlows(benignCount, { Attack: 'Benign' });
    const attacks = buildFlows(attackCount, { Attack: 'DDoS' });
    return [...benign, ...attacks];
  },

  /**
   * Flows from a single source IP (useful for testing filters).
   */
  singleSource(count: number, sourceIp: string): Partial<FlowRecord>[] {
    return buildFlows(count, { IPV4_SRC_ADDR: sourceIp });
  },

  /**
   * Flows to a single destination port (useful for testing filters).
   */
  singleDestPort(count: number, destPort: number): Partial<FlowRecord>[] {
    return buildFlows(count, { L4_DST_PORT: destPort });
  },
};

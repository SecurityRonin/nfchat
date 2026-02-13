/**
 * Chat Module Constants
 *
 * Configuration values, field mappings, and schema definitions.
 */

export const MAX_LIMIT = 10000;
export const DEFAULT_LIMIT = 1000;

/**
 * Mapping from readable filter labels to SQL column names.
 * Must match COLUMN_LABELS in ForensicDashboard.tsx (but reversed).
 */
export const FILTER_LABEL_TO_COLUMN: Record<string, string> = {
  'source ip': 'IPV4_SRC_ADDR',
  'destination ip': 'IPV4_DST_ADDR',
  'src ip': 'IPV4_SRC_ADDR',
  'dst ip': 'IPV4_DST_ADDR',
  'source port': 'L4_SRC_PORT',
  'destination port': 'L4_DST_PORT',
  'src port': 'L4_SRC_PORT',
  'dst port': 'L4_DST_PORT',
  'protocol': 'PROTOCOL',
  'attack type': 'Attack',
  attack: 'Attack',
  'in bytes': 'IN_BYTES',
  'out bytes': 'OUT_BYTES',
  'hmm state': 'HMM_STATE',
  'cluster': 'HMM_STATE',
  'connection state': 'CONN_STATE',
  'conn state': 'CONN_STATE',
};

/**
 * Columns that should be treated as numeric (no quotes around value)
 */
export const NUMERIC_COLUMNS = new Set([
  'L4_SRC_PORT',
  'L4_DST_PORT',
  'PROTOCOL',
  'IN_BYTES',
  'OUT_BYTES',
  'IN_PKTS',
  'OUT_PKTS',
  'TCP_FLAGS',
  'Label',
  'HMM_STATE',
]);

/**
 * Netflow schema for AI context
 */
export const NETFLOW_SCHEMA = `
Available columns in the 'flows' table:
- FLOW_START_MILLISECONDS (BIGINT): Flow start timestamp
- FLOW_END_MILLISECONDS (BIGINT): Flow end timestamp
- IPV4_SRC_ADDR (VARCHAR): Source IP address
- L4_SRC_PORT (BIGINT): Source port
- IPV4_DST_ADDR (VARCHAR): Destination IP address
- L4_DST_PORT (BIGINT): Destination port
- PROTOCOL (BIGINT): IP protocol number (6=TCP, 17=UDP, 1=ICMP)
- IN_BYTES (BIGINT): Incoming bytes
- OUT_BYTES (BIGINT): Outgoing bytes
- IN_PKTS (BIGINT): Incoming packets
- OUT_PKTS (BIGINT): Outgoing packets
- TCP_FLAGS (BIGINT): TCP flags
- FLOW_DURATION_MILLISECONDS (BIGINT): Flow duration
- Attack (VARCHAR): Attack type label (e.g., 'Benign', 'Exploits', 'DoS', 'Fuzzers', etc.)
- Label (BIGINT): Binary label (0=benign, 1=attack)
- HMM_STATE (INTEGER): Discovered behavioral cluster ID from unsupervised HMM analysis
- CONN_STATE (VARCHAR): Zeek connection state (SF=complete, S0=no reply, REJ=rejected, RSTO=reset originator, RSTR=reset responder)
`;

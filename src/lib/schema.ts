export interface FlowRecord {
  FLOW_START_MILLISECONDS: number;
  FLOW_END_MILLISECONDS: number;
  IPV4_SRC_ADDR: string;
  L4_SRC_PORT: number;
  IPV4_DST_ADDR: string;
  L4_DST_PORT: number;
  PROTOCOL: number;
  L7_PROTO: number;
  IN_BYTES: number;
  IN_PKTS: number;
  OUT_BYTES: number;
  OUT_PKTS: number;
  TCP_FLAGS: number;
  CLIENT_TCP_FLAGS: number;
  SERVER_TCP_FLAGS: number;
  FLOW_DURATION_MILLISECONDS: number;
  DURATION_IN: number;
  DURATION_OUT: number;
  MIN_TTL: number;
  MAX_TTL: number;
  LONGEST_FLOW_PKT: number;
  SHORTEST_FLOW_PKT: number;
  MIN_IP_PKT_LEN: number;
  MAX_IP_PKT_LEN: number;
  SRC_TO_DST_SECOND_BYTES: number;
  DST_TO_SRC_SECOND_BYTES: number;
  RETRANSMITTED_IN_BYTES: number;
  RETRANSMITTED_IN_PKTS: number;
  RETRANSMITTED_OUT_BYTES: number;
  RETRANSMITTED_OUT_PKTS: number;
  SRC_TO_DST_AVG_THROUGHPUT: number;
  DST_TO_SRC_AVG_THROUGHPUT: number;
  NUM_PKTS_UP_TO_128_BYTES: number;
  NUM_PKTS_128_TO_256_BYTES: number;
  NUM_PKTS_256_TO_512_BYTES: number;
  NUM_PKTS_512_TO_1024_BYTES: number;
  NUM_PKTS_1024_TO_1514_BYTES: number;
  TCP_WIN_MAX_IN: number;
  TCP_WIN_MAX_OUT: number;
  ICMP_TYPE: number;
  ICMP_IPV4_TYPE: number;
  DNS_QUERY_ID: number;
  DNS_QUERY_TYPE: number;
  DNS_TTL_ANSWER: number;
  FTP_COMMAND_RET_CODE: number;
  SRC_TO_DST_IAT_MIN: number;
  SRC_TO_DST_IAT_MAX: number;
  SRC_TO_DST_IAT_AVG: number;
  SRC_TO_DST_IAT_STDDEV: number;
  DST_TO_SRC_IAT_MIN: number;
  DST_TO_SRC_IAT_MAX: number;
  DST_TO_SRC_IAT_AVG: number;
  DST_TO_SRC_IAT_STDDEV: number;
  Label: string;
  Attack: string;
  // MITRE ATT&CK fields (UWF-ZeekData24)
  MITRE_TACTIC?: string;
  MITRE_TECHNIQUE?: string;
  // Zeek-specific fields
  CONN_STATE?: string;
  SERVICE?: string;
  HISTORY?: string;
  COMMUNITY_ID?: string;
}

export const SCHEMA_DESCRIPTION = `
Table: flows
Columns:
- FLOW_START_MILLISECONDS (BIGINT): Unix timestamp in milliseconds when flow started
- FLOW_END_MILLISECONDS (BIGINT): Unix timestamp in milliseconds when flow ended
- IPV4_SRC_ADDR (VARCHAR): Source IP address
- IPV4_DST_ADDR (VARCHAR): Destination IP address
- L4_SRC_PORT (INTEGER): Source port number
- L4_DST_PORT (INTEGER): Destination port number
- PROTOCOL (INTEGER): IP protocol (6=TCP, 17=UDP, 1=ICMP)
- L7_PROTO (DOUBLE): Layer 7 protocol (5=DNS, 7=HTTP, 91=SSH, 37=BitTorrent, etc.)
- IN_BYTES (INTEGER): Incoming bytes (src->dst)
- OUT_BYTES (INTEGER): Outgoing bytes (dst->src)
- IN_PKTS (INTEGER): Incoming packets
- OUT_PKTS (INTEGER): Outgoing packets
- TCP_FLAGS (INTEGER): Cumulative TCP flags
- CLIENT_TCP_FLAGS (INTEGER): Client TCP flags
- SERVER_TCP_FLAGS (INTEGER): Server TCP flags
- FLOW_DURATION_MILLISECONDS (INTEGER): Total flow duration in ms
- MIN_TTL (INTEGER): Minimum TTL observed
- MAX_TTL (INTEGER): Maximum TTL observed
- LONGEST_FLOW_PKT (INTEGER): Largest packet size in bytes
- SHORTEST_FLOW_PKT (INTEGER): Smallest packet size in bytes
- SRC_TO_DST_AVG_THROUGHPUT (DOUBLE): Average throughput src->dst in bps
- DST_TO_SRC_AVG_THROUGHPUT (DOUBLE): Average throughput dst->src in bps
- RETRANSMITTED_IN_BYTES (INTEGER): Retransmitted bytes src->dst
- RETRANSMITTED_OUT_BYTES (INTEGER): Retransmitted bytes dst->src
- DNS_QUERY_ID (INTEGER): DNS transaction ID
- DNS_QUERY_TYPE (INTEGER): DNS query type (1=A, 2=NS, 5=CNAME, etc.)
- DNS_TTL_ANSWER (INTEGER): TTL of DNS A record
- Label (VARCHAR): Binary classification (Benign/Attack)
- Attack (VARCHAR): Attack type / MITRE Tactic
- MITRE_TACTIC (VARCHAR): MITRE ATT&CK Tactic (Credential Access, Reconnaissance, Initial Access, etc.)
- MITRE_TECHNIQUE (VARCHAR): MITRE ATT&CK Technique ID (T1110, T1595, T1078, T1190, T1048, etc.)
- CONN_STATE (VARCHAR): Zeek connection state (S0, S1, SF, REJ, etc.)
- SERVICE (VARCHAR): Detected application protocol (http, dns, ssh, etc.)
- COMMUNITY_ID (VARCHAR): Community ID flow hash for cross-tool correlation
`;

// Legacy attack types (NF-UNSW-NB15)
export const LEGACY_ATTACK_TYPES = [
  'Benign',
  'Exploits',
  'Fuzzers',
  'Generic',
  'Reconnaissance',
  'DoS',
  'Backdoor',
  'Shellcode',
  'Analysis',
  'Worms',
] as const;

// MITRE ATT&CK Tactics (UWF-ZeekData24)
export const MITRE_TACTICS = [
  'Benign',
  'Credential Access',
  'Reconnaissance',
  'Initial Access',
  'Defense Evasion',
  'Persistence',
  'Privilege Escalation',
  'Exfiltration',
  'Lateral Movement',
  'Collection',
  'Command and Control',
  'Impact',
  'Execution',
  'Discovery',
] as const;

// Combined attack types (supports both datasets)
export const ATTACK_TYPES = [
  ...LEGACY_ATTACK_TYPES,
  ...MITRE_TACTICS.filter(t => !LEGACY_ATTACK_TYPES.includes(t as never)),
] as const;

export type AttackType = (typeof ATTACK_TYPES)[number];

export const ATTACK_COLORS: Record<string, string> = {
  // Legacy attack types
  Benign: '#22c55e',      // green
  Exploits: '#ef4444',    // red
  Fuzzers: '#f97316',     // orange
  Generic: '#eab308',     // yellow
  Reconnaissance: '#3b82f6', // blue
  DoS: '#a855f7',         // purple
  Backdoor: '#ec4899',    // pink
  Shellcode: '#14b8a6',   // teal
  Analysis: '#6366f1',    // indigo
  Worms: '#78716c',       // stone
  // MITRE ATT&CK Tactics
  'Credential Access': '#dc2626',   // red-600
  'Initial Access': '#ea580c',      // orange-600
  'Defense Evasion': '#ca8a04',     // yellow-600
  'Persistence': '#65a30d',         // lime-600
  'Privilege Escalation': '#0d9488', // teal-600
  'Exfiltration': '#7c3aed',        // violet-600
  'Lateral Movement': '#db2777',    // pink-600
  'Collection': '#0284c7',          // sky-600
  'Command and Control': '#9333ea', // purple-600
  'Impact': '#be123c',              // rose-700
  'Execution': '#c2410c',           // orange-700
  'Discovery': '#4f46e5',           // indigo-600
  'Unknown': '#71717a',             // zinc-500
};

export const PROTOCOL_NAMES: Record<number, string> = {
  1: 'ICMP',
  6: 'TCP',
  17: 'UDP',
  47: 'GRE',
  50: 'ESP',
  51: 'AH',
  89: 'OSPF',
  132: 'SCTP',
};

export const L7_PROTO_NAMES: Record<number, string> = {
  0: 'Unknown',
  5: 'DNS',
  7: 'HTTP',
  37: 'BitTorrent',
  91: 'SSH',
  92: 'SSL/TLS',
  131: 'HTTPS',
};

// MITRE ATT&CK Technique Reference (UWF-ZeekData24)
export const MITRE_TECHNIQUES: Record<string, { name: string; tactic: string; url: string }> = {
  'T1110': { name: 'Brute Force', tactic: 'Credential Access', url: 'https://attack.mitre.org/techniques/T1110/' },
  'T1595': { name: 'Active Scanning', tactic: 'Reconnaissance', url: 'https://attack.mitre.org/techniques/T1595/' },
  'T1078': { name: 'Valid Accounts', tactic: 'Defense Evasion', url: 'https://attack.mitre.org/techniques/T1078/' },
  'T1190': { name: 'Exploit Public-Facing Application', tactic: 'Initial Access', url: 'https://attack.mitre.org/techniques/T1190/' },
  'T1048': { name: 'Exfiltration Over Alternative Protocol', tactic: 'Exfiltration', url: 'https://attack.mitre.org/techniques/T1048/' },
  'T1046': { name: 'Network Service Discovery', tactic: 'Discovery', url: 'https://attack.mitre.org/techniques/T1046/' },
  'T1071': { name: 'Application Layer Protocol', tactic: 'Command and Control', url: 'https://attack.mitre.org/techniques/T1071/' },
  'T1021': { name: 'Remote Services', tactic: 'Lateral Movement', url: 'https://attack.mitre.org/techniques/T1021/' },
};

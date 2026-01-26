import type { ProgressCallback, LogCallback } from '../progress';

export interface LoadDataOptions {
  onProgress?: ProgressCallback;
  onLog?: LogCallback;
}

export interface TimeRange {
  min: number;
  max: number;
}

export interface AttackDistribution {
  attack: string;
  count: number;
}

export interface TopTalker {
  ip: string;
  value: number;
}

export interface ProtocolDistribution {
  protocol: number;
  count: number;
}

export interface TimelineDataPoint {
  time: number;
  attack: string;
  count: number;
}

export interface NetworkEdge {
  source: string;
  target: string;
  weight: number;
}

/**
 * Attack Session - flows grouped by source IP within a time window
 * showing progression through MITRE ATT&CK tactics.
 */
export interface AttackSession {
  session_id: string;
  src_ip: string;
  start_time: number;
  end_time: number;
  duration_minutes: number;
  flow_count: number;
  tactics: string[];
  techniques: string[];
  target_ips: string[];
  target_ports: number[];
  total_bytes: number;
}

/**
 * Kill Chain Phase - a single tactic in an attack session timeline.
 */
export interface KillChainPhase {
  session_id: string;
  src_ip: string;
  tactic: string;
  technique: string;
  phase_start: number;
  phase_end: number;
  flow_count: number;
  target_ips: string[];
  bytes_transferred: number;
}

/**
 * Attack Narrative - complete story of an attack session.
 */
export interface AttackNarrative {
  session: AttackSession;
  phases: KillChainPhase[];
  kill_chain_coverage: number; // percentage of ATT&CK phases covered
}

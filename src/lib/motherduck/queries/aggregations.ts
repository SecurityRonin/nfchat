/**
 * Aggregation Queries
 *
 * Attack distribution, top talkers, timeline, network graph.
 */

import { executeQuery } from './executor';
import type {
  AttackDistribution,
  TopTalker,
  ProtocolDistribution,
  TimelineDataPoint,
  NetworkEdge,
  AttackSession,
  KillChainPhase,
} from '../types';

/**
 * Get attack type distribution.
 */
export async function getAttackDistribution(): Promise<AttackDistribution[]> {
  return executeQuery(`
    SELECT Attack as attack, COUNT(*) as count
    FROM flows
    GROUP BY Attack
    ORDER BY count DESC
  `);
}

/**
 * Get top IP talkers by flows or bytes.
 */
export async function getTopTalkers(
  direction: 'src' | 'dst',
  metric: 'bytes' | 'flows',
  limit: number = 10,
  whereClause: string = '1=1'
): Promise<TopTalker[]> {
  const ipCol = direction === 'src' ? 'IPV4_SRC_ADDR' : 'IPV4_DST_ADDR';
  const valueExpr =
    metric === 'bytes' ? 'SUM(IN_BYTES + OUT_BYTES)' : 'COUNT(*)';

  return executeQuery(`
    SELECT ${ipCol} as ip, ${valueExpr} as value
    FROM flows
    WHERE ${whereClause}
    GROUP BY ${ipCol}
    ORDER BY value DESC
    LIMIT ${limit}
  `);
}

/**
 * Get protocol distribution.
 */
export async function getProtocolDistribution(
  whereClause: string = '1=1'
): Promise<ProtocolDistribution[]> {
  return executeQuery(`
    SELECT PROTOCOL as protocol, COUNT(*) as count
    FROM flows
    WHERE ${whereClause}
    GROUP BY PROTOCOL
    ORDER BY count DESC
  `);
}

/**
 * Get time-bucketed flow data for timeline visualization.
 */
export async function getTimelineData(
  bucketMinutes: number = 60,
  whereClause: string = '1=1'
): Promise<TimelineDataPoint[]> {
  const bucketMs = bucketMinutes * 60 * 1000;

  return executeQuery(`
    SELECT
      (FLOW_START_MILLISECONDS / ${bucketMs}) * ${bucketMs} as time,
      Attack as attack,
      COUNT(*) as count
    FROM flows
    WHERE ${whereClause}
    GROUP BY time, attack
    ORDER BY time, attack
  `);
}

/**
 * Get network graph edges (source -> destination pairs).
 */
export async function getNetworkGraph(
  limit: number = 100,
  whereClause: string = '1=1'
): Promise<NetworkEdge[]> {
  return executeQuery(`
    SELECT
      IPV4_SRC_ADDR as source,
      IPV4_DST_ADDR as target,
      COUNT(*) as weight
    FROM flows
    WHERE ${whereClause}
    GROUP BY IPV4_SRC_ADDR, IPV4_DST_ADDR
    ORDER BY weight DESC
    LIMIT ${limit}
  `);
}

/**
 * Get attack sessions - flows grouped by source IP within time windows.
 * Only returns sessions with multiple tactics (potential kill chain).
 */
export async function getAttackSessions(
  sessionWindowMinutes: number = 30,
  minTactics: number = 2,
  limit: number = 50
): Promise<AttackSession[]> {
  const windowMs = sessionWindowMinutes * 60 * 1000;

  const results = await executeQuery<AttackSession>(`
    WITH sessions AS (
      SELECT
        IPV4_SRC_ADDR as src_ip,
        (FLOW_START_MILLISECONDS / ${windowMs}) as session_bucket,
        MIN(FLOW_START_MILLISECONDS) as start_time,
        MAX(FLOW_END_MILLISECONDS) as end_time,
        COUNT(*) as flow_count,
        LIST(DISTINCT MITRE_TACTIC) FILTER (WHERE MITRE_TACTIC != '') as tactics,
        LIST(DISTINCT MITRE_TECHNIQUE) FILTER (WHERE MITRE_TECHNIQUE != '') as techniques,
        LIST(DISTINCT IPV4_DST_ADDR) as target_ips,
        LIST(DISTINCT L4_DST_PORT) as target_ports,
        SUM(IN_BYTES + OUT_BYTES) as total_bytes
      FROM flows
      WHERE Label = 'Attack' AND MITRE_TACTIC != ''
      GROUP BY src_ip, session_bucket
    )
    SELECT
      src_ip || '-' || session_bucket as session_id,
      src_ip,
      start_time,
      end_time,
      (end_time - start_time) / 60000.0 as duration_minutes,
      flow_count,
      tactics,
      techniques,
      target_ips[:10] as target_ips,
      target_ports[:20] as target_ports,
      total_bytes
    FROM sessions
    WHERE len(tactics) >= ${minTactics}
    ORDER BY start_time DESC
    LIMIT ${limit}
  `);

  // Ensure array fields are proper JavaScript arrays
  return results.map(session => ({
    ...session,
    tactics: Array.isArray(session.tactics) ? session.tactics : Array.from(session.tactics || []),
    techniques: Array.isArray(session.techniques) ? session.techniques : Array.from(session.techniques || []),
    target_ips: Array.isArray(session.target_ips) ? session.target_ips : Array.from(session.target_ips || []),
    target_ports: Array.isArray(session.target_ports) ? session.target_ports : Array.from(session.target_ports || []),
  }));
}

/**
 * Get kill chain phases for a specific attack session.
 * Shows tactic progression over time within the session.
 */
export async function getKillChainPhases(
  srcIp: string,
  startTime: number,
  endTime: number
): Promise<KillChainPhase[]> {
  const results = await executeQuery<KillChainPhase>(`
    SELECT
      '${srcIp}' as session_id,
      '${srcIp}' as src_ip,
      MITRE_TACTIC as tactic,
      MITRE_TECHNIQUE as technique,
      MIN(FLOW_START_MILLISECONDS) as phase_start,
      MAX(FLOW_END_MILLISECONDS) as phase_end,
      COUNT(*) as flow_count,
      LIST(DISTINCT IPV4_DST_ADDR)[:5] as target_ips,
      SUM(IN_BYTES + OUT_BYTES) as bytes_transferred
    FROM flows
    WHERE IPV4_SRC_ADDR = '${srcIp}'
      AND FLOW_START_MILLISECONDS >= ${startTime}
      AND FLOW_END_MILLISECONDS <= ${endTime}
      AND MITRE_TACTIC != ''
    GROUP BY MITRE_TACTIC, MITRE_TECHNIQUE
    ORDER BY phase_start ASC
  `);

  // Ensure array fields are proper JavaScript arrays
  return results.map(phase => ({
    ...phase,
    target_ips: Array.isArray(phase.target_ips) ? phase.target_ips : Array.from(phase.target_ips || []),
  }));
}

/**
 * Get MITRE tactic distribution for attack flows.
 */
export async function getMitreTacticDistribution(): Promise<AttackDistribution[]> {
  return executeQuery(`
    SELECT MITRE_TACTIC as attack, COUNT(*) as count
    FROM flows
    WHERE MITRE_TACTIC != '' AND MITRE_TACTIC IS NOT NULL
    GROUP BY MITRE_TACTIC
    ORDER BY count DESC
  `);
}

/**
 * Get MITRE technique distribution.
 */
export async function getMitreTechniqueDistribution(): Promise<{technique: string; tactic: string; count: number}[]> {
  return executeQuery(`
    SELECT
      MITRE_TECHNIQUE as technique,
      MITRE_TACTIC as tactic,
      COUNT(*) as count
    FROM flows
    WHERE MITRE_TECHNIQUE != '' AND MITRE_TECHNIQUE IS NOT NULL
    GROUP BY MITRE_TECHNIQUE, MITRE_TACTIC
    ORDER BY count DESC
    LIMIT 20
  `);
}

import { Database } from './database.js'

export interface TopTalkerResult {
  ip: string
  count: number
}

export interface AttackBreakdownResult {
  attack: string
  count: number
}

export interface ProtocolDistributionResult {
  protocol: number
  count: number
}

export interface InvestigateIPResult {
  flows: Record<string, unknown>[]
  summary: {
    totalFlows: number
    attackTypes: string[]
    protocols: number[]
    timeRange: { start: number; end: number }
  }
}

export interface TimeRangeResult {
  start: number
  end: number
}

export async function getTopTalkers(
  db: Database,
  options: { limit?: number; direction: 'src' | 'dst' }
): Promise<TopTalkerResult[]> {
  const column = options.direction === 'src' ? 'IPV4_SRC_ADDR' : 'IPV4_DST_ADDR'
  const limit = options.limit ?? 10

  const result = await db.query<{ ip: string; count: bigint }>(
    `SELECT ${column} as ip, COUNT(*) as count
     FROM flows
     GROUP BY ${column}
     ORDER BY count DESC
     LIMIT ${limit}`
  )

  return result.map((r) => ({ ip: r.ip, count: Number(r.count) }))
}

export async function getAttackBreakdown(db: Database): Promise<AttackBreakdownResult[]> {
  const result = await db.query<{ attack: string; count: bigint }>(
    `SELECT Attack as attack, COUNT(*) as count
     FROM flows
     GROUP BY Attack
     ORDER BY count DESC`
  )

  return result.map((r) => ({ attack: r.attack, count: Number(r.count) }))
}

export async function getProtocolDistribution(
  db: Database
): Promise<ProtocolDistributionResult[]> {
  const result = await db.query<{ protocol: number; count: bigint }>(
    `SELECT PROTOCOL as protocol, COUNT(*) as count
     FROM flows
     GROUP BY PROTOCOL
     ORDER BY count DESC`
  )

  return result.map((r) => ({ protocol: r.protocol, count: Number(r.count) }))
}

export async function investigateIP(
  db: Database,
  ip: string,
  options?: { limit?: number }
): Promise<InvestigateIPResult> {
  const limit = options?.limit ?? 100

  // Get flows involving this IP (as source or destination)
  const flows = await db.query(
    `SELECT * FROM flows
     WHERE IPV4_SRC_ADDR = '${ip}' OR IPV4_DST_ADDR = '${ip}'
     LIMIT ${limit}`
  )

  // Get summary statistics
  const summary = await db.query<{
    totalFlows: bigint
    minTime: number
    maxTime: number
  }>(
    `SELECT
       COUNT(*) as totalFlows,
       MIN(FLOW_START_MILLISECONDS) as minTime,
       MAX(FLOW_START_MILLISECONDS) as maxTime
     FROM flows
     WHERE IPV4_SRC_ADDR = '${ip}' OR IPV4_DST_ADDR = '${ip}'`
  )

  const attacks = await db.query<{ attack: string }>(
    `SELECT DISTINCT Attack as attack FROM flows
     WHERE IPV4_SRC_ADDR = '${ip}' OR IPV4_DST_ADDR = '${ip}'`
  )

  const protocols = await db.query<{ protocol: number }>(
    `SELECT DISTINCT PROTOCOL as protocol FROM flows
     WHERE IPV4_SRC_ADDR = '${ip}' OR IPV4_DST_ADDR = '${ip}'`
  )

  return {
    flows,
    summary: {
      totalFlows: Number(summary[0]?.totalFlows ?? 0),
      attackTypes: attacks.map((a) => a.attack),
      protocols: protocols.map((p) => p.protocol),
      timeRange: {
        start: summary[0]?.minTime ?? 0,
        end: summary[0]?.maxTime ?? 0,
      },
    },
  }
}

export async function getTimeRange(db: Database): Promise<TimeRangeResult> {
  const result = await db.query<{ start: number; end: number }>(
    `SELECT
       MIN(FLOW_START_MILLISECONDS) as start,
       MAX(FLOW_START_MILLISECONDS) as end
     FROM flows`
  )

  return {
    start: result[0]?.start ?? 0,
    end: result[0]?.end ?? 0,
  }
}

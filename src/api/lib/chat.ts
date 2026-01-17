/**
 * Chat API Logic
 *
 * Handles AI-driven data fetching flow:
 * 1. Determine what queries the AI needs to answer the question
 * 2. Analyze data with AI and return response
 *
 * Uses Vercel AI Gateway:
 * - OIDC auth automatic on Vercel deployments
 * - For local dev: set AI_GATEWAY_API_KEY or use `vercel dev`
 */

import { generateText } from 'ai'

const MAX_LIMIT = 10000
const DEFAULT_LIMIT = 1000

// Mapping from readable filter labels to SQL column names
// Must match COLUMN_LABELS in ForensicDashboard.tsx (but reversed)
const FILTER_LABEL_TO_COLUMN: Record<string, string> = {
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
  'attack': 'Attack',
  'in bytes': 'IN_BYTES',
  'out bytes': 'OUT_BYTES',
}

// Columns that should be treated as numeric (no quotes around value)
const NUMERIC_COLUMNS = new Set([
  'L4_SRC_PORT',
  'L4_DST_PORT',
  'PROTOCOL',
  'IN_BYTES',
  'OUT_BYTES',
  'IN_PKTS',
  'OUT_PKTS',
  'TCP_FLAGS',
  'Label',
])

// Netflow schema for the AI to understand
const NETFLOW_SCHEMA = `
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
`

/**
 * Build the system prompt for query generation
 */
export function buildQuerySystemPrompt(): string {
  return `You are a network security analyst assistant helping analyze NetFlow data.

${NETFLOW_SCHEMA}

When asked questions about the network data, generate SQL queries to answer the question.
Rules:
1. Only use SELECT statements
2. Always include LIMIT clauses (max ${MAX_LIMIT})
3. Focus on security-relevant analysis
4. Use proper SQL syntax for DuckDB

Respond with a JSON object containing:
{
  "queries": ["SQL query 1", "SQL query 2", ...],
  "reasoning": "Brief explanation of why these queries help answer the question"
}`
}

/**
 * Build the system prompt for data analysis
 */
export function buildAnalysisSystemPrompt(): string {
  return `You are a network security analyst assistant helping analyze NetFlow data.

${NETFLOW_SCHEMA}

Analyze the provided query results and give a clear, actionable security analysis.
Focus on:
1. Identifying suspicious patterns or anomalies
2. Highlighting potential security threats
3. Providing specific recommendations
4. Summarizing key findings concisely

Be direct and security-focused in your response.`
}

/**
 * Validate SQL is safe to execute (SELECT only)
 */
export function validateSQL(sql: string): boolean {
  const normalized = sql.trim().toUpperCase()

  // Must start with SELECT
  if (!normalized.startsWith('SELECT')) return false

  // Block dangerous keywords
  const forbidden = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'TRUNCATE', 'EXEC', 'EXECUTE']
  for (const keyword of forbidden) {
    // Check for keyword as whole word
    const regex = new RegExp(`\\b${keyword}\\b`)
    if (regex.test(normalized)) return false
  }

  return true
}

/**
 * Sanitize SQL by adding LIMIT if missing
 */
export function sanitizeSQL(sql: string): string {
  const normalized = sql.trim().toUpperCase()

  if (!normalized.includes('LIMIT')) {
    return `${sql.trim()} LIMIT ${DEFAULT_LIMIT}`
  }

  // Check if limit exceeds max
  const limitMatch = normalized.match(/LIMIT\s+(\d+)/)
  if (limitMatch) {
    const limit = parseInt(limitMatch[1], 10)
    if (limit > MAX_LIMIT) {
      return sql.replace(/LIMIT\s+\d+/i, `LIMIT ${MAX_LIMIT}`)
    }
  }

  return sql
}

interface DetermineQueriesResult {
  queries: string[]
  reasoning?: string
}

/**
 * Ask AI what queries it needs to answer the question
 * Uses Vercel AI Gateway with automatic OIDC auth
 */
export async function determineNeededQueries(question: string): Promise<DetermineQueriesResult> {
  // For simple greetings or non-data questions, return empty
  const lowerQuestion = question.toLowerCase()
  if (
    lowerQuestion.match(/^(hi|hello|hey|thanks|thank you|bye|goodbye)/i) ||
    lowerQuestion.length < 10
  ) {
    return { queries: [] }
  }

  // First, check for "Filter by X = Y" pattern (click-to-filter)
  const filterQuery = parseFilterPattern(question)
  if (filterQuery) {
    return { queries: [filterQuery] }
  }

  try {
    // Use Vercel AI Gateway - OIDC auth is automatic on Vercel
    const { text } = await generateText({
      model: 'anthropic/claude-sonnet-4',
      system: buildQuerySystemPrompt(),
      prompt: question,
    })

    // Parse JSON response
    const parsed = JSON.parse(text)
    const queries = (parsed.queries || [])
      .filter((q: string) => validateSQL(q))
      .map((q: string) => sanitizeSQL(q))

    return {
      queries,
      reasoning: parsed.reasoning,
    }
  } catch (error) {
    // Fallback to keyword-based queries if AI fails
    console.error('[Chat] AI Gateway error, using fallback:', error)
    return generateFallbackQueries(question)
  }
}

/**
 * Parse "Filter by X = Y" patterns from click-to-filter actions
 * Returns SQL query if pattern matches, null otherwise
 */
function parseFilterPattern(question: string): string | null {
  // Match "Filter by <label> = <value>" pattern (case-insensitive)
  const match = question.match(/^filter by\s+(.+?)\s*=\s*(.+)$/i)
  if (!match) return null

  const [, labelPart, valuePart] = match
  const label = labelPart.trim().toLowerCase()
  const value = valuePart.trim()

  // Look up column name from label
  const columnName = FILTER_LABEL_TO_COLUMN[label]
  if (!columnName) return null

  // Build WHERE clause with proper quoting
  let whereCondition: string
  if (NUMERIC_COLUMNS.has(columnName)) {
    // Numeric column - no quotes
    whereCondition = `${columnName} = ${value}`
  } else {
    // String column - escape single quotes and wrap in quotes
    const escapedValue = value.replace(/'/g, "''")
    whereCondition = `${columnName} = '${escapedValue}'`
  }

  return `SELECT * FROM flows WHERE ${whereCondition} LIMIT ${DEFAULT_LIMIT}`
}

/**
 * Generate fallback queries based on keywords when AI is unavailable
 */
function generateFallbackQueries(question: string): DetermineQueriesResult {
  const lowerQuestion = question.toLowerCase()
  const queries: string[] = []

  if (lowerQuestion.includes('attack') || lowerQuestion.includes('threat')) {
    queries.push("SELECT Attack, COUNT(*) as count FROM flows GROUP BY Attack ORDER BY count DESC LIMIT 20")
  }

  if (lowerQuestion.includes('ip') || lowerQuestion.includes('source') || lowerQuestion.includes('address')) {
    queries.push("SELECT IPV4_SRC_ADDR as ip, COUNT(*) as count FROM flows GROUP BY IPV4_SRC_ADDR ORDER BY count DESC LIMIT 20")
  }

  if (lowerQuestion.includes('port') || lowerQuestion.includes('scan')) {
    queries.push("SELECT IPV4_SRC_ADDR, COUNT(DISTINCT L4_DST_PORT) as ports FROM flows GROUP BY IPV4_SRC_ADDR HAVING ports > 10 ORDER BY ports DESC LIMIT 20")
  }

  if (lowerQuestion.includes('traffic') || lowerQuestion.includes('bytes') || lowerQuestion.includes('volume')) {
    queries.push("SELECT IPV4_SRC_ADDR, SUM(IN_BYTES + OUT_BYTES) as total_bytes FROM flows GROUP BY IPV4_SRC_ADDR ORDER BY total_bytes DESC LIMIT 20")
  }

  // Default query if nothing matches
  if (queries.length === 0) {
    queries.push("SELECT Attack, COUNT(*) as count FROM flows GROUP BY Attack ORDER BY count DESC LIMIT 20")
  }

  return { queries }
}

interface AnalyzeResult {
  response: string
}

/**
 * Analyze data with AI and return response
 * Uses Vercel AI Gateway with automatic OIDC auth
 */
export async function analyzeWithData(
  question: string,
  data: unknown[]
): Promise<AnalyzeResult> {
  if (data.length === 0) {
    return { response: 'No data was returned from the query. Try asking a different question.' }
  }

  try {
    // Use Vercel AI Gateway - OIDC auth is automatic on Vercel
    const { text } = await generateText({
      model: 'anthropic/claude-sonnet-4',
      system: buildAnalysisSystemPrompt(),
      prompt: `Question: ${question}

Query Results (${data.length} records):
${JSON.stringify(data.slice(0, 100), null, 2)}
${data.length > 100 ? `\n... and ${data.length - 100} more records` : ''}

Analyze these results and provide security insights.`,
    })

    return { response: text }
  } catch (error) {
    // Fallback response if AI fails
    console.error('[Chat] AI Gateway error in analysis:', error)
    return {
      response: `Based on the data provided, I can see ${data.length} records. AI analysis encountered an error. Please check AI Gateway configuration.`,
    }
  }
}

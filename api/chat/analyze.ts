/**
 * Vercel API Route: POST /api/chat/analyze
 *
 * Step 2 of AI-driven data fetching:
 * Accept query results, return AI analysis
 *
 * Note: Code is inlined because Vercel doesn't properly trace
 * imports from shared modules in the api/ directory.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { generateText } from 'ai'

// ============================================================================
// Inlined from src/api/lib/turnstile.ts
// ============================================================================

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

interface TurnstileResult {
  success: boolean
  error?: string
}

interface TurnstileResponse {
  success: boolean
  'error-codes'?: string[]
}

async function verifyTurnstileToken(
  token: string,
  remoteip: string
): Promise<TurnstileResult> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY

  // In development without secret key, allow bypass
  if (!secretKey) {
    console.warn('[Turnstile] No TURNSTILE_SECRET_KEY set, skipping verification')
    return { success: true }
  }

  // Dev bypass token for testing
  if (token === 'dev-bypass' && process.env.NODE_ENV === 'development') {
    return { success: true }
  }

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
        remoteip,
      }),
    })

    const data: TurnstileResponse = await response.json()

    if (data.success) {
      return { success: true }
    }

    return {
      success: false,
      error: data['error-codes']?.[0] || 'verification-failed',
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

// ============================================================================
// Inlined from src/api/lib/chat.ts - uses Vercel AI Gateway
// ============================================================================

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

function buildAnalysisSystemPrompt(): string {
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

interface AnalyzeResult {
  response: string
}

async function analyzeWithData(
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

// ============================================================================
// Handler
// ============================================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { question, data, turnstileToken } = req.body || {}

    // Validate required fields
    if (!question || (typeof question === 'string' && question.trim().length === 0)) {
      return res.status(400).json({ success: false, error: 'Missing question' })
    }

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ success: false, error: 'Missing or invalid data' })
    }

    if (!turnstileToken || (typeof turnstileToken === 'string' && turnstileToken.trim().length === 0)) {
      return res.status(400).json({ success: false, error: 'Missing turnstile token' })
    }

    // Get client IP from Vercel headers
    const clientIP =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1'

    // Verify Turnstile token
    const turnstileResult = await verifyTurnstileToken(turnstileToken, clientIP)
    if (!turnstileResult.success) {
      return res.status(400).json({
        success: false,
        error: `Turnstile verification failed: ${turnstileResult.error}`,
      })
    }

    // Get AI analysis (fallback mode)
    const result = await analyzeWithData(question, data)

    return res.status(200).json({
      success: true,
      response: result.response,
    })
  } catch (error) {
    console.error('Chat analyze error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    })
  }
}

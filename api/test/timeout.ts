/**
 * Vercel API Route: GET /api/test/timeout
 *
 * Simple test endpoint to verify Fluid Compute's extended timeout.
 * Sleeps for a configurable duration (default 65s) and returns success.
 * If the function is killed before completing, Fluid Compute isn't working.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'

export const config = {
  maxDuration: 300,
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const seconds = Math.min(Number(req.query.seconds) || 65, 280)
  const start = Date.now()

  console.log(`[timeout-test] Starting ${seconds}s sleep at ${new Date().toISOString()}`)

  await new Promise((resolve) => setTimeout(resolve, seconds * 1000))

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`[timeout-test] Completed after ${elapsed}s`)

  return res.status(200).json({
    success: true,
    requestedSeconds: seconds,
    actualElapsed: `${elapsed}s`,
    fluidCompute: 'confirmed working',
  })
}

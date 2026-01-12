/**
 * Vercel API Route: POST /api/motherduck/load
 *
 * Load parquet data from a URL into MotherDuck.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'

// Ensure HOME is set before any duckdb imports
if (!process.env.HOME) {
  process.env.HOME = '/tmp'
}

// Dynamic import to ensure HOME is set first
let loadParquetData: (url: string) => Promise<number>

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Load module dynamically on first request
  if (!loadParquetData) {
    try {
      const module = await import('../lib/motherduck-server')
      loadParquetData = module.loadParquetData
    } catch (importError) {
      const message = importError instanceof Error ? importError.message : String(importError)
      console.error('[API] Failed to import motherduck-server:', message)
      return res.status(500).json({ success: false, error: `Module import failed: ${message}` })
    }
  }
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { url } = req.body || {}

    // Validate URL
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Missing URL' })
    }

    // Validate URL format
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid URL format' })
    }

    // Require HTTPS
    if (parsedUrl.protocol !== 'https:') {
      return res.status(400).json({ success: false, error: 'URL must use HTTPS' })
    }

    console.log('[API] Loading parquet from:', url)
    const rowCount = await loadParquetData(url)

    return res.status(200).json({ success: true, rowCount })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('MotherDuck load error:', errorMessage)
    return res.status(500).json({
      success: false,
      error: errorMessage,
    })
  }
}

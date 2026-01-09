/**
 * Vercel API Route: GET /api/auth/github
 *
 * Initiates GitHub OAuth flow by redirecting to GitHub
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getGitHubAuthURL, generateState } from '../../src/api/lib/auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Generate state for CSRF protection
    const state = generateState()

    // Store state in cookie for verification on callback
    res.setHeader(
      'Set-Cookie',
      `oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`
    )

    // Redirect to GitHub
    const authURL = getGitHubAuthURL(state)
    res.redirect(302, authURL)
  } catch (error) {
    console.error('GitHub auth error:', error)
    res.status(500).json({ error: 'Failed to initiate OAuth' })
  }
}

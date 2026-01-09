/**
 * Vercel API Route: GET /api/auth/callback
 *
 * GitHub OAuth callback - exchanges code for token and creates session
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  exchangeCodeForToken,
  getGitHubUser,
  findOrCreateUser,
  generateSessionToken,
} from '../../src/api/lib/auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { code, state } = req.query

    // Verify state matches cookie
    const cookies = req.headers.cookie || ''
    const storedState = cookies.match(/oauth_state=([^;]+)/)?.[1]

    if (!state || state !== storedState) {
      return res.status(400).json({ error: 'Invalid state parameter' })
    }

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Missing authorization code' })
    }

    // Exchange code for access token
    const accessToken = await exchangeCodeForToken(code)

    // Get GitHub user profile
    const githubUser = await getGitHubUser(accessToken)

    // Find or create user in our database
    const user = await findOrCreateUser(githubUser)

    // Generate session token
    const sessionToken = generateSessionToken()

    // Set session cookie and clear OAuth state
    const isProduction = process.env.NODE_ENV === 'production'
    const secure = isProduction ? 'Secure; ' : ''

    res.setHeader('Set-Cookie', [
      `session=${sessionToken}; Path=/; HttpOnly; ${secure}SameSite=Lax; Max-Age=604800`,
      `user_id=${user.id}; Path=/; HttpOnly; ${secure}SameSite=Lax; Max-Age=604800`,
      `oauth_state=; Path=/; HttpOnly; Max-Age=0`,
    ])

    // Redirect to app
    const redirectUrl = process.env.APP_URL || '/'
    res.redirect(302, redirectUrl)
  } catch (error) {
    console.error('OAuth callback error:', error)
    res.status(500).json({ error: 'Authentication failed' })
  }
}

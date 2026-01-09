/**
 * Vercel API Route: GET /api/auth/me
 *
 * Returns current user info and remaining credits
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getUserById } from '../../src/api/db/client'
import { getRateLimitCount } from '../../src/api/db/client'
import { getRemainingQueries } from '../../src/api/lib/rate-limit'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get user ID from session cookie
    const cookies = req.headers.cookie || ''
    const userId = cookies.match(/user_id=([^;]+)/)?.[1]

    if (!userId) {
      // Anonymous user
      const clientIP =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        '127.0.0.1'

      const currentCount = await getRateLimitCount({ ipAddress: clientIP })
      const remaining = getRemainingQueries({
        currentCount,
        credits: 0,
        isAuthenticated: false,
      })

      return res.status(200).json({
        authenticated: false,
        remaining,
      })
    }

    // Authenticated user
    const user = await getUserById(userId)

    if (!user) {
      // Invalid session, clear cookies
      res.setHeader('Set-Cookie', [
        `session=; Path=/; HttpOnly; Max-Age=0`,
        `user_id=; Path=/; HttpOnly; Max-Age=0`,
      ])
      return res.status(401).json({ error: 'Invalid session' })
    }

    const currentCount = await getRateLimitCount({ userId: user.id })
    const remaining = getRemainingQueries({
      currentCount,
      credits: user.credits,
      isAuthenticated: true,
    })

    return res.status(200).json({
      authenticated: true,
      user: {
        id: user.id,
        github_login: user.github_login,
        credits: user.credits,
      },
      remaining,
    })
  } catch (error) {
    console.error('Auth me error:', error)
    res.status(500).json({ error: 'Failed to get user info' })
  }
}

/**
 * Vercel API Route: POST /api/auth/logout
 *
 * Clears session cookies and logs out user
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Clear session cookies
  res.setHeader('Set-Cookie', [
    `session=; Path=/; HttpOnly; Max-Age=0`,
    `user_id=; Path=/; HttpOnly; Max-Age=0`,
  ])

  return res.status(200).json({ success: true })
}

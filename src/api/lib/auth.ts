/**
 * GitHub OAuth Implementation
 *
 * Handles GitHub OAuth flow for user authentication
 */

import crypto from 'crypto'
import { getUserByGithubId, createUser, type User } from '../db/client'

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize'
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'
const GITHUB_USER_URL = 'https://api.github.com/user'

export interface GitHubUser {
  id: number
  login: string
  email?: string
  avatar_url?: string
}

/**
 * Generate the GitHub OAuth authorization URL
 */
export function getGitHubAuthURL(state: string): string {
  const clientId = process.env.GITHUB_CLIENT_ID
  const redirectUri = process.env.GITHUB_REDIRECT_URI

  const params = new URLSearchParams({
    client_id: clientId || '',
    redirect_uri: redirectUri || '',
    scope: 'read:user user:email',
    state,
  })

  return `${GITHUB_AUTHORIZE_URL}?${params.toString()}`
}

/**
 * Exchange the authorization code for an access token
 */
export async function exchangeCodeForToken(code: string): Promise<string> {
  const clientId = process.env.GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET

  const response = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  })

  const data = await response.json()

  if (data.error) {
    throw new Error(data.error)
  }

  return data.access_token
}

/**
 * Fetch the GitHub user profile using the access token
 */
export async function getGitHubUser(accessToken: string): Promise<GitHubUser> {
  const response = await fetch(GITHUB_USER_URL, {
    headers: {
      Authorization: `token ${accessToken}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch GitHub user')
  }

  return response.json()
}

/**
 * Find an existing user or create a new one from GitHub profile
 */
export async function findOrCreateUser(githubUser: GitHubUser): Promise<User> {
  // Check for existing user
  const existingUser = await getUserByGithubId(githubUser.id)

  if (existingUser) {
    return existingUser
  }

  // Create new user
  return createUser({
    github_id: githubUser.id,
    github_login: githubUser.login,
    email: githubUser.email,
  })
}

/**
 * Generate a random session token
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Generate a random state parameter for CSRF protection
 */
export function generateState(): string {
  return crypto.randomBytes(16).toString('hex')
}

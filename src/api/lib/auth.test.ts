/**
 * GitHub OAuth Tests (TDD)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock fetch
global.fetch = vi.fn()

// Mock database client
vi.mock('../db/client', () => ({
  getUserByGithubId: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
}))

describe('GitHub OAuth', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env = {
      ...originalEnv,
      GITHUB_CLIENT_ID: 'test-client-id',
      GITHUB_CLIENT_SECRET: 'test-client-secret',
      GITHUB_REDIRECT_URI: 'http://localhost:3000/api/auth/callback',
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('getGitHubAuthURL', () => {
    it('generates correct OAuth URL', async () => {
      const { getGitHubAuthURL } = await import('./auth')
      const url = getGitHubAuthURL('random-state')

      expect(url).toContain('https://github.com/login/oauth/authorize')
      expect(url).toContain('client_id=test-client-id')
      expect(url).toContain('state=random-state')
      // URL encodes colons as %3A
      expect(url).toMatch(/scope=read(%3A|:)user/)
    })
  })

  describe('exchangeCodeForToken', () => {
    it('exchanges code for access token', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'gho_test123', token_type: 'bearer' }),
      } as Response)

      const { exchangeCodeForToken } = await import('./auth')
      const token = await exchangeCodeForToken('auth-code')

      expect(token).toBe('gho_test123')
      expect(fetch).toHaveBeenCalledWith(
        'https://github.com/login/oauth/access_token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Accept: 'application/json' }),
        })
      )
    })

    it('throws error on failed exchange', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: 'bad_verification_code' }),
      } as Response)

      const { exchangeCodeForToken } = await import('./auth')

      await expect(exchangeCodeForToken('invalid-code')).rejects.toThrow('bad_verification_code')
    })
  })

  describe('getGitHubUser', () => {
    it('fetches user profile from GitHub', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 12345, login: 'testuser', email: 'test@example.com' }),
      } as Response)

      const { getGitHubUser } = await import('./auth')
      const user = await getGitHubUser('gho_token')

      expect(user.id).toBe(12345)
      expect(user.login).toBe('testuser')
      expect(fetch).toHaveBeenCalledWith(
        'https://api.github.com/user',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'token gho_token' }),
        })
      )
    })

    it('throws error on failed user fetch', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response)

      const { getGitHubUser } = await import('./auth')

      await expect(getGitHubUser('invalid-token')).rejects.toThrow('Failed to fetch GitHub user')
    })
  })

  describe('findOrCreateUser', () => {
    it('returns existing user', async () => {
      const { getUserByGithubId } = await import('../db/client')
      vi.mocked(getUserByGithubId).mockResolvedValueOnce({
        id: 'uuid-1',
        github_id: 12345,
        github_login: 'testuser',
        credits: 10,
      })

      const { findOrCreateUser } = await import('./auth')
      const user = await findOrCreateUser({ id: 12345, login: 'testuser', email: 'test@example.com' })

      expect(user.id).toBe('uuid-1')
      expect(user.credits).toBe(10)
    })

    it('creates new user when not found', async () => {
      const { getUserByGithubId, createUser } = await import('../db/client')
      vi.mocked(getUserByGithubId).mockResolvedValueOnce(null)
      vi.mocked(createUser).mockResolvedValueOnce({
        id: 'uuid-new',
        github_id: 54321,
        github_login: 'newuser',
        credits: 0,
      })

      const { findOrCreateUser } = await import('./auth')
      const user = await findOrCreateUser({ id: 54321, login: 'newuser', email: 'new@example.com' })

      expect(user.id).toBe('uuid-new')
      expect(createUser).toHaveBeenCalledWith({
        github_id: 54321,
        github_login: 'newuser',
        email: 'new@example.com',
      })
    })
  })

  describe('generateSessionToken', () => {
    it('generates a random session token', async () => {
      const { generateSessionToken } = await import('./auth')
      const token1 = generateSessionToken()
      const token2 = generateSessionToken()

      expect(token1).toHaveLength(64) // 32 bytes hex encoded
      expect(token2).toHaveLength(64)
      expect(token1).not.toBe(token2)
    })
  })
})

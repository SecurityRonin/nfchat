/**
 * Database Client Tests (TDD)
 *
 * Tests database operations in mock mode
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock @vercel/postgres
vi.mock('@vercel/postgres', () => ({
  sql: vi.fn(),
}))

describe('Database Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe('getUserByGithubId', () => {
    it('returns user when found', async () => {
      const { sql } = await import('@vercel/postgres')
      vi.mocked(sql).mockResolvedValueOnce({
        rows: [{ id: 'uuid-1', github_id: 123, github_login: 'testuser', credits: 10 }],
        rowCount: 1,
      } as never)

      const { getUserByGithubId } = await import('./client')
      const user = await getUserByGithubId(123)

      expect(user).toEqual({
        id: 'uuid-1',
        github_id: 123,
        github_login: 'testuser',
        credits: 10,
      })
    })

    it('returns null when user not found', async () => {
      const { sql } = await import('@vercel/postgres')
      vi.mocked(sql).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as never)

      const { getUserByGithubId } = await import('./client')
      const user = await getUserByGithubId(999)

      expect(user).toBeNull()
    })
  })

  describe('createUser', () => {
    it('creates a new user', async () => {
      const { sql } = await import('@vercel/postgres')
      vi.mocked(sql).mockResolvedValueOnce({
        rows: [{ id: 'uuid-new', github_id: 456, github_login: 'newuser', credits: 0 }],
        rowCount: 1,
      } as never)

      const { createUser } = await import('./client')
      const user = await createUser({ github_id: 456, github_login: 'newuser', email: 'new@test.com' })

      expect(user.github_id).toBe(456)
      expect(user.github_login).toBe('newuser')
    })
  })

  describe('getRateLimitCount', () => {
    it('returns count for authenticated user', async () => {
      const { sql } = await import('@vercel/postgres')
      vi.mocked(sql).mockResolvedValueOnce({
        rows: [{ count: 5 }],
        rowCount: 1,
      } as never)

      const { getRateLimitCount } = await import('./client')
      const count = await getRateLimitCount({ userId: 'uuid-1' })

      expect(count).toBe(5)
    })

    it('returns 0 when no rate limit record exists', async () => {
      const { sql } = await import('@vercel/postgres')
      vi.mocked(sql).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as never)

      const { getRateLimitCount } = await import('./client')
      const count = await getRateLimitCount({ userId: 'uuid-1' })

      expect(count).toBe(0)
    })

    it('returns count for anonymous IP', async () => {
      const { sql } = await import('@vercel/postgres')
      vi.mocked(sql).mockResolvedValueOnce({
        rows: [{ count: 2 }],
        rowCount: 1,
      } as never)

      const { getRateLimitCount } = await import('./client')
      const count = await getRateLimitCount({ ipAddress: '192.168.1.1' })

      expect(count).toBe(2)
    })
  })

  describe('incrementRateLimit', () => {
    it('increments count for authenticated user', async () => {
      const { sql } = await import('@vercel/postgres')
      vi.mocked(sql).mockResolvedValueOnce({
        rows: [{ count: 6 }],
        rowCount: 1,
      } as never)

      const { incrementRateLimit } = await import('./client')
      const newCount = await incrementRateLimit({ userId: 'uuid-1' })

      expect(newCount).toBe(6)
    })

    it('increments count for anonymous IP', async () => {
      const { sql } = await import('@vercel/postgres')
      vi.mocked(sql).mockResolvedValueOnce({
        rows: [{ count: 1 }],
        rowCount: 1,
      } as never)

      const { incrementRateLimit } = await import('./client')
      const newCount = await incrementRateLimit({ ipAddress: '10.0.0.1' })

      expect(newCount).toBe(1)
    })
  })

  describe('deductCredits', () => {
    it('deducts credits from user', async () => {
      const { sql } = await import('@vercel/postgres')
      vi.mocked(sql).mockResolvedValueOnce({
        rows: [{ credits: 9 }],
        rowCount: 1,
      } as never)

      const { deductCredits } = await import('./client')
      const remaining = await deductCredits('uuid-1', 1)

      expect(remaining).toBe(9)
    })

    it('throws error if insufficient credits', async () => {
      const { sql } = await import('@vercel/postgres')
      vi.mocked(sql).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as never)

      const { deductCredits } = await import('./client')

      await expect(deductCredits('uuid-1', 100)).rejects.toThrow('Insufficient credits')
    })
  })

  describe('createConversation', () => {
    it('creates a new conversation', async () => {
      const { sql } = await import('@vercel/postgres')
      vi.mocked(sql).mockResolvedValueOnce({
        rows: [{ id: 'conv-uuid', session_id: 'session-123' }],
        rowCount: 1,
      } as never)

      const { createConversation } = await import('./client')
      const conv = await createConversation({ sessionId: 'session-123', userId: 'uuid-1' })

      expect(conv.id).toBe('conv-uuid')
      expect(conv.session_id).toBe('session-123')
    })
  })

  describe('saveMessage', () => {
    it('saves a message to conversation', async () => {
      const { sql } = await import('@vercel/postgres')
      vi.mocked(sql).mockResolvedValueOnce({
        rows: [{ id: 'msg-uuid', role: 'user', content: { question: 'test?' } }],
        rowCount: 1,
      } as never)

      const { saveMessage } = await import('./client')
      const msg = await saveMessage({
        conversationId: 'conv-uuid',
        role: 'user',
        content: { question: 'test?' },
      })

      expect(msg.id).toBe('msg-uuid')
      expect(msg.role).toBe('user')
    })
  })
})

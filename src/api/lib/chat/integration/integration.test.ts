/**
 * Integration Module Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { determineNeededQueries, analyzeWithData } from './index';

// Mock the AI module
vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

import { generateText } from 'ai';

const mockGenerateText = vi.mocked(generateText);

describe('determineNeededQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty queries for greetings', async () => {
    const result = await determineNeededQueries('hi');
    expect(result.queries).toEqual([]);
  });

  it('returns empty queries for short input', async () => {
    const result = await determineNeededQueries('ok');
    expect(result.queries).toEqual([]);
  });

  it('parses filter patterns without calling AI', async () => {
    const result = await determineNeededQueries(
      'Filter by source ip = 192.168.1.1'
    );
    expect(result.queries).toHaveLength(1);
    expect(result.queries[0]).toContain("IPV4_SRC_ADDR = '192.168.1.1'");
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it('calls AI for complex questions', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({
        queries: ['SELECT Attack, COUNT(*) FROM flows GROUP BY Attack'],
        reasoning: 'Testing',
      }),
    } as unknown as Awaited<ReturnType<typeof generateText>>);

    const result = await determineNeededQueries('What are the top attacks?');
    expect(mockGenerateText).toHaveBeenCalled();
    expect(result.queries.length).toBeGreaterThan(0);
  });

  it('validates and sanitizes AI queries', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({
        queries: [
          'SELECT * FROM flows', // Missing LIMIT
          'DELETE FROM flows', // Invalid - should be filtered
        ],
        reasoning: 'Testing',
      }),
    } as unknown as Awaited<ReturnType<typeof generateText>>);

    const result = await determineNeededQueries('Show me some data');
    // DELETE should be filtered out
    expect(result.queries.every((q) => !q.includes('DELETE'))).toBe(true);
    // Valid SELECT should have LIMIT added
    const selectQuery = result.queries.find((q) => q.includes('SELECT'));
    expect(selectQuery).toContain('LIMIT');
  });

  it('falls back to keyword queries on AI error', async () => {
    mockGenerateText.mockRejectedValueOnce(new Error('API Error'));

    const result = await determineNeededQueries(
      'What are the attack patterns?'
    );
    expect(result.queries.length).toBeGreaterThan(0);
    expect(result.queries[0]).toContain('Attack');
  });
});

describe('analyzeWithData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns message for empty data', async () => {
    const result = await analyzeWithData('Test question', []);
    expect(result.response).toContain('No data');
  });

  it('calls AI for non-empty data', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: 'Analysis: Found suspicious patterns...',
    } as unknown as Awaited<ReturnType<typeof generateText>>);

    const result = await analyzeWithData('What do you see?', [
      { Attack: 'DoS', count: 100 },
    ]);
    expect(mockGenerateText).toHaveBeenCalled();
    expect(result.response).toBe('Analysis: Found suspicious patterns...');
  });

  it('returns fallback response on AI error', async () => {
    mockGenerateText.mockRejectedValueOnce(new Error('API Error'));

    const result = await analyzeWithData('What do you see?', [
      { Attack: 'DoS', count: 100 },
    ]);
    expect(result.response).toContain('1 records');
    expect(result.response).toContain('error');
  });
});

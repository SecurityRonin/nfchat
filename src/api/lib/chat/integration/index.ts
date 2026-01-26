/**
 * AI Integration Module
 *
 * Claude API integration via Vercel AI Gateway.
 */

import { generateText } from 'ai';
import { logger } from '@/lib/logger';
import { validateSQL, sanitizeSQL } from '../validation';
import { buildQuerySystemPrompt, buildAnalysisSystemPrompt } from '../prompts';
import { isGreeting, parseFilterPattern, generateFallbackQueries } from '../queries';
import type { DetermineQueriesResult, AnalyzeResult } from '../types';

/**
 * Ask AI what queries it needs to answer the question.
 * Uses Vercel AI Gateway with automatic OIDC auth.
 */
export async function determineNeededQueries(
  question: string
): Promise<DetermineQueriesResult> {
  // For simple greetings or non-data questions, return empty
  if (isGreeting(question)) {
    return { queries: [] };
  }

  // First, check for "Filter by X = Y" pattern (click-to-filter)
  const filterQuery = parseFilterPattern(question);
  if (filterQuery) {
    return { queries: [filterQuery] };
  }

  try {
    // Use Vercel AI Gateway - OIDC auth is automatic on Vercel
    const { text } = await generateText({
      model: 'anthropic/claude-sonnet-4',
      system: buildQuerySystemPrompt(),
      prompt: question,
    });

    // Parse JSON response
    const parsed = JSON.parse(text);
    const queries = (parsed.queries || [])
      .filter((q: string) => validateSQL(q))
      .map((q: string) => sanitizeSQL(q));

    return {
      queries,
      reasoning: parsed.reasoning,
    };
  } catch (error) {
    // Fallback to keyword-based queries if AI fails
    logger.error('AI Gateway error, using fallback', { context: 'Chat', error });
    return generateFallbackQueries(question);
  }
}

/**
 * Analyze data with AI and return response.
 * Uses Vercel AI Gateway with automatic OIDC auth.
 */
export async function analyzeWithData(
  question: string,
  data: unknown[]
): Promise<AnalyzeResult> {
  if (data.length === 0) {
    return {
      response:
        'No data was returned from the query. Try asking a different question.',
    };
  }

  try {
    // Use Vercel AI Gateway - OIDC auth is automatic on Vercel
    const { text } = await generateText({
      model: 'anthropic/claude-sonnet-4',
      system: buildAnalysisSystemPrompt(),
      prompt: `Question: ${question}

Query Results (${data.length} records):
${JSON.stringify(data.slice(0, 100), null, 2)}
${data.length > 100 ? `\n... and ${data.length - 100} more records` : ''}

Analyze these results and provide security insights.`,
    });

    return { response: text };
  } catch (error) {
    // Fallback response if AI fails
    logger.error('AI Gateway error in analysis', { context: 'Chat', error });
    return {
      response: `Based on the data provided, I can see ${data.length} records. AI analysis encountered an error. Please check AI Gateway configuration.`,
    };
  }
}

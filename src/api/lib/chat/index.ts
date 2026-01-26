/**
 * Chat Module
 *
 * AI-driven network analysis and query generation.
 *
 * Modular structure:
 * - constants.ts     - Configuration and schema
 * - types.ts         - Type definitions
 * - prompts/         - System prompts for AI
 * - validation/      - SQL validation and sanitization
 * - queries/         - Query parsing and fallback logic
 * - integration/     - Claude API integration
 */

// Types
export type {
  DetermineQueriesResult,
  AnalyzeResult,
  ValidationResult,
} from './types';

// Constants
export {
  MAX_LIMIT,
  DEFAULT_LIMIT,
  FILTER_LABEL_TO_COLUMN,
  NUMERIC_COLUMNS,
  NETFLOW_SCHEMA,
} from './constants';

// Prompts
export { buildQuerySystemPrompt, buildAnalysisSystemPrompt } from './prompts';

// Validation
export { validateSQL, sanitizeSQL } from './validation';

// Queries
export {
  isGreeting,
  parseFilterPattern,
  generateFallbackQueries,
} from './queries';

// Integration
export { determineNeededQueries, analyzeWithData } from './integration';

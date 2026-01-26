/**
 * Chat API Logic - Backwards Compatibility Re-export
 *
 * The chat module has been decomposed into modular files under chat/.
 * This file re-exports the public API for backwards compatibility.
 *
 * Modular structure:
 * - chat/constants.ts     - Configuration and schema
 * - chat/types.ts         - Type definitions
 * - chat/prompts/         - System prompts for AI
 * - chat/validation/      - SQL validation and sanitization
 * - chat/queries/         - Query parsing and fallback logic
 * - chat/integration/     - Claude API integration
 */

export {
  // Types
  type DetermineQueriesResult,
  type AnalyzeResult,
  // Prompts
  buildQuerySystemPrompt,
  buildAnalysisSystemPrompt,
  // Validation
  validateSQL,
  sanitizeSQL,
  // Integration
  determineNeededQueries,
  analyzeWithData,
} from './chat/index';

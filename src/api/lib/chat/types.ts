/**
 * Chat Module Type Definitions
 */

/**
 * Result from query determination
 */
export interface DetermineQueriesResult {
  queries: string[];
  reasoning?: string;
}

/**
 * Result from AI analysis
 */
export interface AnalyzeResult {
  response: string;
}

/**
 * SQL validation result
 */
export interface ValidationResult {
  isValid: boolean;
  reason?: string;
}

/**
 * Queries Module
 *
 * Query parsing, pattern matching, and fallback query generation.
 */

import {
  DEFAULT_LIMIT,
  FILTER_LABEL_TO_COLUMN,
  NUMERIC_COLUMNS,
} from '../constants';
import type { DetermineQueriesResult } from '../types';

/**
 * Check if input is a greeting or too short to be a real question
 */
export function isGreeting(question: string): boolean {
  const lowerQuestion = question.toLowerCase();
  if (
    lowerQuestion.match(/^(hi|hello|hey|thanks|thank you|bye|goodbye)/i) ||
    lowerQuestion.length < 10
  ) {
    return true;
  }
  return false;
}

/**
 * Parse "Filter by X = Y" patterns from click-to-filter actions.
 * Returns SQL query if pattern matches, null otherwise.
 */
export function parseFilterPattern(question: string): string | null {
  // Match "Filter by <label> = <value>" pattern (case-insensitive)
  const match = question.match(/^filter by\s+(.+?)\s*=\s*(.+)$/i);
  if (!match) return null;

  const [, labelPart, valuePart] = match;
  const label = labelPart.trim().toLowerCase();
  const value = valuePart.trim();

  // Look up column name from label
  const columnName = FILTER_LABEL_TO_COLUMN[label];
  if (!columnName) return null;

  // Build WHERE clause with proper quoting
  let whereCondition: string;
  if (NUMERIC_COLUMNS.has(columnName)) {
    // Numeric column - no quotes
    whereCondition = `${columnName} = ${value}`;
  } else {
    // String column - escape single quotes and wrap in quotes
    const escapedValue = value.replace(/'/g, "''");
    whereCondition = `${columnName} = '${escapedValue}'`;
  }

  return `SELECT * FROM flows WHERE ${whereCondition} LIMIT ${DEFAULT_LIMIT}`;
}

/**
 * Generate fallback queries based on keywords when AI is unavailable
 */
export function generateFallbackQueries(
  question: string
): DetermineQueriesResult {
  const lowerQuestion = question.toLowerCase();
  const queries: string[] = [];

  if (lowerQuestion.includes('attack') || lowerQuestion.includes('threat')) {
    queries.push(
      'SELECT Attack, COUNT(*) as count FROM flows GROUP BY Attack ORDER BY count DESC LIMIT 20'
    );
  }

  if (
    lowerQuestion.includes('ip') ||
    lowerQuestion.includes('source') ||
    lowerQuestion.includes('address')
  ) {
    queries.push(
      'SELECT IPV4_SRC_ADDR as ip, COUNT(*) as count FROM flows GROUP BY IPV4_SRC_ADDR ORDER BY count DESC LIMIT 20'
    );
  }

  if (lowerQuestion.includes('port') || lowerQuestion.includes('scan')) {
    queries.push(
      'SELECT IPV4_SRC_ADDR, COUNT(DISTINCT L4_DST_PORT) as ports FROM flows GROUP BY IPV4_SRC_ADDR HAVING ports > 10 ORDER BY ports DESC LIMIT 20'
    );
  }

  if (
    lowerQuestion.includes('traffic') ||
    lowerQuestion.includes('bytes') ||
    lowerQuestion.includes('volume')
  ) {
    queries.push(
      'SELECT IPV4_SRC_ADDR, SUM(IN_BYTES + OUT_BYTES) as total_bytes FROM flows GROUP BY IPV4_SRC_ADDR ORDER BY total_bytes DESC LIMIT 20'
    );
  }

  // Default query if nothing matches
  if (queries.length === 0) {
    queries.push(
      'SELECT Attack, COUNT(*) as count FROM flows GROUP BY Attack ORDER BY count DESC LIMIT 20'
    );
  }

  return { queries };
}

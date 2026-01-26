/**
 * SQL Validation Module
 *
 * Validates and sanitizes SQL queries for safe execution.
 */

import { MAX_LIMIT, DEFAULT_LIMIT } from '../constants';

/**
 * Validate SQL is safe to execute (SELECT only)
 */
export function validateSQL(sql: string): boolean {
  const normalized = sql.trim().toUpperCase();

  // Must start with SELECT
  if (!normalized.startsWith('SELECT')) return false;

  // Block dangerous keywords
  const forbidden = [
    'DROP',
    'DELETE',
    'INSERT',
    'UPDATE',
    'ALTER',
    'CREATE',
    'TRUNCATE',
    'EXEC',
    'EXECUTE',
  ];

  for (const keyword of forbidden) {
    // Check for keyword as whole word
    const regex = new RegExp(`\\b${keyword}\\b`);
    if (regex.test(normalized)) return false;
  }

  return true;
}

/**
 * Sanitize SQL by adding LIMIT if missing or capping at max
 */
export function sanitizeSQL(sql: string): string {
  const trimmed = sql.trim();
  const normalized = trimmed.toUpperCase();

  if (!normalized.includes('LIMIT')) {
    return `${trimmed} LIMIT ${DEFAULT_LIMIT}`;
  }

  // Check if limit exceeds max
  const limitMatch = normalized.match(/LIMIT\s+(\d+)/);
  if (limitMatch) {
    const limit = parseInt(limitMatch[1], 10);
    if (limit > MAX_LIMIT) {
      return trimmed.replace(/LIMIT\s+\d+/i, `LIMIT ${MAX_LIMIT}`);
    }
  }

  return trimmed;
}

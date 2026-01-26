/**
 * Validation Module Tests
 */

import { describe, it, expect } from 'vitest';
import { validateSQL, sanitizeSQL } from './index';

describe('validateSQL', () => {
  it('accepts valid SELECT statements', () => {
    expect(validateSQL('SELECT * FROM flows')).toBe(true);
    expect(validateSQL('SELECT COUNT(*) FROM flows')).toBe(true);
    expect(validateSQL('SELECT a, b FROM flows WHERE x = 1')).toBe(true);
  });

  it('accepts case-insensitive SELECT', () => {
    expect(validateSQL('select * from flows')).toBe(true);
    expect(validateSQL('Select * From Flows')).toBe(true);
  });

  it('rejects non-SELECT statements', () => {
    expect(validateSQL('INSERT INTO flows VALUES (1)')).toBe(false);
    expect(validateSQL('UPDATE flows SET x = 1')).toBe(false);
    expect(validateSQL('DELETE FROM flows')).toBe(false);
  });

  it('rejects dangerous keywords', () => {
    expect(validateSQL('SELECT * FROM flows; DROP TABLE flows')).toBe(false);
    expect(validateSQL('SELECT * FROM flows; DELETE FROM flows')).toBe(false);
    expect(validateSQL('SELECT * FROM flows; TRUNCATE flows')).toBe(false);
    expect(validateSQL('SELECT * FROM flows; ALTER TABLE flows')).toBe(false);
    expect(validateSQL('SELECT * FROM flows; CREATE TABLE x')).toBe(false);
    expect(validateSQL('SELECT * FROM flows; EXEC procedure')).toBe(false);
    expect(validateSQL('SELECT * FROM flows; EXECUTE procedure')).toBe(false);
  });

  it('handles empty or whitespace strings', () => {
    expect(validateSQL('')).toBe(false);
    expect(validateSQL('   ')).toBe(false);
  });

  it('allows keywords as part of column/table names', () => {
    // DROPPED_AT contains DROP but is a column name
    expect(validateSQL('SELECT DROPPED_AT FROM flows')).toBe(true);
    // UPDATED is a column, not the UPDATE keyword
    expect(validateSQL('SELECT UPDATED FROM flows')).toBe(true);
  });
});

describe('sanitizeSQL', () => {
  it('adds LIMIT if missing', () => {
    const result = sanitizeSQL('SELECT * FROM flows');
    expect(result).toBe('SELECT * FROM flows LIMIT 1000');
  });

  it('preserves existing LIMIT within max', () => {
    const result = sanitizeSQL('SELECT * FROM flows LIMIT 100');
    expect(result).toBe('SELECT * FROM flows LIMIT 100');
  });

  it('caps LIMIT at MAX_LIMIT', () => {
    const result = sanitizeSQL('SELECT * FROM flows LIMIT 50000');
    expect(result).toBe('SELECT * FROM flows LIMIT 10000');
  });

  it('handles case-insensitive LIMIT', () => {
    const result = sanitizeSQL('SELECT * FROM flows limit 100');
    expect(result).toBe('SELECT * FROM flows limit 100');
  });

  it('trims whitespace', () => {
    const result = sanitizeSQL('  SELECT * FROM flows  ');
    expect(result).toBe('SELECT * FROM flows LIMIT 1000');
  });
});

/**
 * Data Upload Validation Tests
 *
 * Tests the 4 main failure modes when a user uploads a dataset:
 * 1. Empty dataset (0 rows)
 * 2. Missing required columns (no IPV4_SRC_ADDR / IPV4_DST_ADDR)
 * 3. Corrupt / unparseable file
 * 4. Wrong data types (e.g. text in a numeric column)
 */

import { describe, it, expect } from 'vitest';
import { validateDataset, formatUploadError } from './data';

// ---------------------------------------------------------------------------
// 1. Empty dataset
// ---------------------------------------------------------------------------

describe('validateDataset – empty file', () => {
  const validHeaders = ['IPV4_SRC_ADDR', 'IPV4_DST_ADDR', 'L4_SRC_PORT'];

  it('rejects a dataset with 0 rows', () => {
    const result = validateDataset(validHeaders, 0);
    expect(result.valid).toBe(false);
  });

  it('returns a human-readable error for an empty dataset', () => {
    const result = validateDataset(validHeaders, 0);
    expect(result.errors).toContain('Dataset is empty (0 rows)');
  });

  it('accepts a dataset with at least 1 row', () => {
    const result = validateDataset(validHeaders, 1);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Missing required columns
// ---------------------------------------------------------------------------

describe('validateDataset – missing required columns', () => {
  it('rejects when IPV4_SRC_ADDR is absent', () => {
    const result = validateDataset(['IPV4_DST_ADDR', 'L4_SRC_PORT'], 100);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing required column: IPV4_SRC_ADDR');
  });

  it('rejects when IPV4_DST_ADDR is absent', () => {
    const result = validateDataset(['IPV4_SRC_ADDR', 'L4_SRC_PORT'], 100);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing required column: IPV4_DST_ADDR');
  });

  it('reports all missing required columns, not just the first', () => {
    const result = validateDataset(['L4_SRC_PORT', 'L4_DST_PORT'], 100);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing required column: IPV4_SRC_ADDR');
    expect(result.errors).toContain('Missing required column: IPV4_DST_ADDR');
  });

  it('accepts column name aliases (e.g. nfdump "sa" for IPV4_SRC_ADDR)', () => {
    // "sa" / "da" are nfdump-style aliases recognised by column-mapper
    const result = validateDataset(['sa', 'da'], 100);
    expect(result.valid).toBe(true);
  });

  it('accepts a dataset that has all required columns', () => {
    const result = validateDataset(['IPV4_SRC_ADDR', 'IPV4_DST_ADDR'], 50);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Corrupt / unparseable file
// ---------------------------------------------------------------------------

describe('formatUploadError – corrupt file', () => {
  it('returns a friendly message for an invalid Parquet file', () => {
    const msg = formatUploadError('Invalid Parquet file');
    expect(msg).toContain('could not be read');
    expect(msg).toContain('corrupt');
  });

  it('returns a friendly message for an invalid CSV file', () => {
    const msg = formatUploadError('Error reading CSV file: unexpected EOF');
    expect(msg).toContain('could not be read');
  });

  it('does not expose raw DuckDB internals to the user', () => {
    const msg = formatUploadError('INTERNAL: DuckDB parser failed at offset 0x4f2');
    expect(msg).not.toContain('0x4f2');
    expect(msg).not.toContain('INTERNAL');
  });
});

// ---------------------------------------------------------------------------
// 4. Wrong data types
// ---------------------------------------------------------------------------

describe('formatUploadError – type mismatch', () => {
  it('returns a friendly message for arithmetic type errors', () => {
    const msg = formatUploadError(
      'Binder Error: Cannot apply arithmetic operator to VARCHAR'
    );
    expect(msg).toContain('column');
    expect(msg).toContain('type');
  });

  it('returns a friendly message for a missing-column DuckDB Binder error', () => {
    const msg = formatUploadError(
      'Binder Error: column with name IPV4_SRC_ADDR does not exist'
    );
    expect(msg).toContain('IPV4_SRC_ADDR');
    expect(msg).toContain('missing');
  });

  it('falls back to a generic message for unknown errors', () => {
    const msg = formatUploadError('some completely unknown error');
    expect(msg.length).toBeGreaterThan(0);
    // Should always return something useful, never an empty string
  });
});

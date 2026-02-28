/**
 * Data Upload Validation
 *
 * Validates uploaded datasets and converts raw DuckDB errors into
 * human-readable messages for the user.
 */

import { REQUIRED_COLUMNS, detectColumnMapping } from '@/lib/column-mapper'

export interface DatasetValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Validate that an uploaded dataset is usable:
 * - Has at least one row
 * - Contains the required columns (or recognised aliases)
 */
export function validateDataset(
  headers: string[],
  rowCount: number
): DatasetValidationResult {
  const errors: string[] = []

  if (rowCount === 0) {
    errors.push('Dataset is empty (0 rows)')
  }

  const detection = detectColumnMapping(headers)
  for (const col of REQUIRED_COLUMNS) {
    if (!detection.mapping?.[col]) {
      errors.push(`Missing required column: ${col}`)
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Convert a raw DuckDB / upload error string into a message suitable
 * for display to the user.
 */
export function formatUploadError(error: string): string {
  const lower = error.toLowerCase()

  // Corrupt / unparseable file
  if (lower.includes('invalid parquet') || lower.includes('invalid csv') || lower.includes('reading csv')) {
    return 'The file could not be read. It may be corrupt or not a valid Parquet/CSV file.'
  }
  if (lower.includes('unexpected eof') || lower.includes('end of file')) {
    return 'The file could not be read. It appears to be incomplete or corrupt.'
  }

  // DuckDB Binder Error – missing column
  const missingColMatch = error.match(/column with name (\S+) does not exist/i)
  if (missingColMatch) {
    return `The dataset is missing the required column "${missingColMatch[1]}". Please check your file has the correct column names.`
  }

  // DuckDB type mismatch / arithmetic on wrong type
  if (lower.includes('type mismatch') || lower.includes('arithmetic operator') || lower.includes('cannot apply')) {
    return 'A column in the dataset has an unexpected type. Please check that numeric columns contain numbers, not text.'
  }
  if (lower.includes('binder error')) {
    return 'The dataset has an unexpected column type or structure. Please verify your file format.'
  }

  // Generic fallback – return something useful but hide implementation details
  return 'The file could not be processed. Please check the file is a valid NetFlow dataset and try again.'
}

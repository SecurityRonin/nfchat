/**
 * MotherDuck Response Transformations
 *
 * Convert query results to usable JavaScript types.
 */

/**
 * Convert BigInt values to Numbers in query results.
 * MotherDuck returns BIGINT columns as JavaScript BigInt, but most
 * JavaScript libraries (charts, etc.) expect regular numbers.
 */
export function convertBigInts<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj) as T;
  if (Array.isArray(obj)) return obj.map(convertBigInts) as T;
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = convertBigInts(value);
    }
    return result as T;
  }
  return obj;
}

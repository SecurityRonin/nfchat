/**
 * MotherDuck Connection Management
 *
 * Handles singleton connection lifecycle with timeout support.
 */

import { MDConnection } from '@motherduck/wasm-client';
import { getMotherDuckToken } from '../motherduck-auth';

// Singleton connection promise — ensures concurrent callers all wait for
// full initialization (including USE my_db) before using the connection.
let connectionPromise: Promise<MDConnection> | null = null;

/**
 * Initialize MotherDuck connection.
 * Requires a valid MotherDuck token configured via Settings or environment.
 *
 * Concurrent callers share the same initialization promise so that
 * `USE my_db` completes before any query executes.
 */
export async function initMotherDuck(): Promise<MDConnection> {
  if (!connectionPromise) {
    connectionPromise = createConnection().catch((err) => {
      // Clear on failure so next call retries
      connectionPromise = null;
      throw err;
    });
  }
  return connectionPromise;
}

async function createConnection(): Promise<MDConnection> {
  const token = getMotherDuckToken();
  if (!token) {
    throw new Error(
      'MotherDuck token not configured. Please add your token in Settings.'
    );
  }

  console.log('[MotherDuck] Creating connection...');
  const conn = MDConnection.create({ mdToken: token });

  const timeoutMs = 30000;
  await Promise.race([
    conn.isInitialized(),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`MotherDuck connection timeout after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);

  // Set default database to my_db where flows table lives
  await conn.evaluateQuery('USE my_db');
  console.log('[MotherDuck] Connection initialized successfully');
  return conn;
}

/**
 * Get the current MotherDuck connection, initializing if needed.
 */
export async function getConnection(): Promise<MDConnection> {
  return initMotherDuck();
}

/**
 * Reset the connection (useful for token changes).
 */
export function resetConnection(): void {
  connectionPromise = null;
}

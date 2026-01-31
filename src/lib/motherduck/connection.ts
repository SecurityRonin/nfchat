/**
 * MotherDuck Connection Management
 *
 * Handles singleton connection lifecycle with timeout support.
 */

import { MDConnection } from '@motherduck/wasm-client';
import { getMotherDuckToken } from '../motherduck-auth';

// Singleton connection
let connection: MDConnection | null = null;

/**
 * Initialize MotherDuck connection.
 * Requires a valid MotherDuck token configured via Settings or environment.
 */
export async function initMotherDuck(): Promise<MDConnection> {
  if (connection) return connection;

  const token = getMotherDuckToken();
  if (!token) {
    throw new Error(
      'MotherDuck token not configured. Please add your token in Settings.'
    );
  }

  console.log('[MotherDuck] Creating connection...');
  connection = MDConnection.create({ mdToken: token });

  // Add timeout for initialization
  const timeoutMs = 30000;
  const initPromise = connection.isInitialized();
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(
      () => reject(new Error(`MotherDuck connection timeout after ${timeoutMs}ms`)),
      timeoutMs
    );
  });

  try {
    await Promise.race([initPromise, timeoutPromise]);
    // Set default database to my_db where flows table lives
    await connection.evaluateQuery('USE my_db');
    console.log('[MotherDuck] Connection initialized successfully');
  } catch (err) {
    connection = null;
    throw err;
  }

  return connection;
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
  connection = null;
}

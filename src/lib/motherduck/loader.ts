/**
 * MotherDuck Data Loader
 *
 * Load data from files or URLs into MotherDuck.
 */

import { getConnection, resetConnection } from './connection';
import { getFlowCount } from './queries/flows';
import type { LoadDataOptions } from './types';

/**
 * Load data from a local file into MotherDuck.
 * Uses hybrid execution: reads file locally, stores in MotherDuck cloud.
 */
export async function loadFileToMotherDuck(
  file: File,
  options?: LoadDataOptions
): Promise<number> {
  const { onProgress, onLog } = options ?? {};

  // Initialize connection
  onProgress?.({
    stage: 'initializing',
    percent: 5,
    message: 'Connecting to MotherDuck...',
    timestamp: Date.now(),
  });
  onLog?.({
    level: 'info',
    message: 'Connecting to MotherDuck cloud',
    timestamp: Date.now(),
  });

  const conn = await getConnection();

  // Determine file type
  const isParquet = file.name.toLowerCase().endsWith('.parquet');
  const isCSV = file.name.toLowerCase().endsWith('.csv');

  if (!isParquet && !isCSV) {
    throw new Error('Unsupported file type. Please upload a .parquet or .csv file.');
  }

  // Upload progress
  onProgress?.({
    stage: 'uploading',
    percent: 10,
    message: `Uploading ${file.name}...`,
    timestamp: Date.now(),
  });
  onLog?.({
    level: 'info',
    message: `Reading file: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`,
    timestamp: Date.now(),
  });

  // Read file as ArrayBuffer
  const buffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(buffer);

  // Register file with MotherDuck's local context
  onProgress?.({
    stage: 'uploading',
    percent: 50,
    message: 'Transferring to MotherDuck cloud...',
    timestamp: Date.now(),
  });

  // Create table from file data
  onProgress?.({
    stage: 'parsing',
    percent: 70,
    message: 'Creating table in MotherDuck...',
    timestamp: Date.now(),
  });
  onLog?.({
    level: 'info',
    message: 'Executing CREATE TABLE (this may take a while for large files)',
    timestamp: Date.now(),
  });

  // Convert buffer to base64 for inline loading
  const base64Data = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));

  if (isParquet) {
    await conn.evaluateQuery(`
      CREATE OR REPLACE TABLE flows AS
      SELECT * FROM read_parquet(decode('${base64Data}')::BLOB)
    `);
  } else {
    await conn.evaluateQuery(`
      CREATE OR REPLACE TABLE flows AS
      SELECT * FROM read_csv(decode('${base64Data}')::BLOB, auto_detect=true)
    `);
  }

  onLog?.({
    level: 'info',
    message: 'Table created successfully',
    timestamp: Date.now(),
  });

  // Get row count
  onProgress?.({
    stage: 'parsing',
    percent: 95,
    message: 'Counting rows...',
    timestamp: Date.now(),
  });

  const count = await getFlowCount();

  onLog?.({
    level: 'info',
    message: `Loaded ${count.toLocaleString()} rows`,
    timestamp: Date.now(),
  });

  onProgress?.({
    stage: 'complete',
    percent: 100,
    message: `Loaded ${count.toLocaleString()} rows`,
    timestamp: Date.now(),
  });

  return count;
}

/**
 * Load data from a URL into MotherDuck.
 * MotherDuck can directly read from HTTP URLs.
 */
export async function loadParquetData(
  url: string,
  options?: LoadDataOptions
): Promise<number> {
  const { onProgress, onLog } = options ?? {};
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Initialize connection
      onProgress?.({
        stage: 'initializing',
        percent: 5,
        message:
          attempt > 1
            ? `Reconnecting (attempt ${attempt}/${maxRetries})...`
            : 'Connecting to MotherDuck...',
        timestamp: Date.now(),
      });
      onLog?.({
        level: 'info',
        message:
          attempt > 1
            ? `Retry attempt ${attempt}/${maxRetries}`
            : 'Connecting to MotherDuck cloud',
        timestamp: Date.now(),
      });

      // Reset connection on retry
      if (attempt > 1) {
        resetConnection();
      }

      const conn = await getConnection();

      // Start progress animation for long-running query
      let progressPercent = 20;
      const progressInterval = setInterval(() => {
        progressPercent = Math.min(progressPercent + 2, 85);
        onProgress?.({
          stage: 'downloading',
          percent: progressPercent,
          message: `Loading parquet data... ${progressPercent}%`,
          timestamp: Date.now(),
        });
      }, 2000);

      onProgress?.({
        stage: 'downloading',
        percent: 20,
        message: 'Downloading parquet file...',
        timestamp: Date.now(),
      });
      onLog?.({
        level: 'info',
        message: `Fetching ${url}`,
        timestamp: Date.now(),
      });

      // Create table directly from URL
      onLog?.({
        level: 'info',
        message: 'Creating table (this may take 1-2 minutes for large files)',
        timestamp: Date.now(),
      });

      try {
        await conn.evaluateQuery(`
          CREATE OR REPLACE TABLE flows AS
          SELECT * FROM read_parquet('${url}')
        `);
      } finally {
        clearInterval(progressInterval);
      }

      onProgress?.({
        stage: 'parsing',
        percent: 90,
        message: 'Table created successfully',
        timestamp: Date.now(),
      });
      onLog?.({
        level: 'info',
        message: 'Table created successfully',
        timestamp: Date.now(),
      });

      // Get row count
      onProgress?.({
        stage: 'parsing',
        percent: 95,
        message: 'Counting rows...',
        timestamp: Date.now(),
      });

      const count = await getFlowCount();

      onLog?.({
        level: 'info',
        message: `Loaded ${count.toLocaleString()} rows`,
        timestamp: Date.now(),
      });

      onProgress?.({
        stage: 'complete',
        percent: 100,
        message: `Loaded ${count.toLocaleString()} rows`,
        timestamp: Date.now(),
      });

      return count;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const isRetryable =
        lastError.message.includes('lease expired') ||
        lastError.message.includes('timeout') ||
        lastError.message.includes('connection');

      onLog?.({
        level: 'warn',
        message: `Attempt ${attempt} failed: ${lastError.message}`,
        timestamp: Date.now(),
      });

      if (!isRetryable || attempt === maxRetries) {
        throw lastError;
      }

      // Wait before retry with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      onLog?.({
        level: 'info',
        message: `Waiting ${delay / 1000}s before retry...`,
        timestamp: Date.now(),
      });
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Failed to load parquet data');
}

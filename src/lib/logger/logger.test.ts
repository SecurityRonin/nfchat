import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger, LogLevel } from './index';

describe('Logger', () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
    debug: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createLogger', () => {
    it('creates a logger with default context', () => {
      const logger = createLogger();
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('creates a logger with custom context', () => {
      const logger = createLogger({ context: 'TestModule' });
      logger.info('test message');

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('[TestModule]'),
        'test message'
      );
    });
  });

  describe('log levels', () => {
    it('logs info messages', () => {
      const logger = createLogger({ context: 'Test' });
      logger.info('info message');

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        'info message'
      );
    });

    it('logs warn messages', () => {
      const logger = createLogger({ context: 'Test' });
      logger.warn('warning message');

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('[WARN]'),
        'warning message'
      );
    });

    it('logs error messages', () => {
      const logger = createLogger({ context: 'Test' });
      logger.error('error message');

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        'error message'
      );
    });

    it('logs debug messages', () => {
      const logger = createLogger({ context: 'Test', level: LogLevel.DEBUG });
      logger.debug('debug message');

      expect(consoleSpy.debug).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]'),
        'debug message'
      );
    });
  });

  describe('log level filtering', () => {
    it('filters debug messages when level is INFO', () => {
      const logger = createLogger({ context: 'Test', level: LogLevel.INFO });
      logger.debug('should not appear');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });

    it('shows all messages when level is DEBUG', () => {
      const logger = createLogger({ context: 'Test', level: LogLevel.DEBUG });
      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');

      expect(consoleSpy.debug).toHaveBeenCalled();
      expect(consoleSpy.log).toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('only shows errors when level is ERROR', () => {
      const logger = createLogger({ context: 'Test', level: LogLevel.ERROR });
      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('structured logging', () => {
    it('logs with additional data', () => {
      const logger = createLogger({ context: 'Test' });
      const data = { userId: 123, action: 'login' };
      logger.info('user action', data);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        'user action',
        data
      );
    });

    it('logs errors with stack traces', () => {
      const logger = createLogger({ context: 'Test' });
      const error = new Error('Test error');
      logger.error('operation failed', { error });

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        'operation failed',
        expect.objectContaining({ error })
      );
    });
  });

  describe('child loggers', () => {
    it('creates child logger with extended context', () => {
      const parent = createLogger({ context: 'Parent' });
      const child = parent.child('Child');
      child.info('child message');

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('[Parent:Child]'),
        'child message'
      );
    });
  });

  describe('timestamps', () => {
    it('includes ISO timestamp in log output', () => {
      const logger = createLogger({ context: 'Test' });
      logger.info('timed message');

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
        'timed message'
      );
    });
  });
});

export { LogLevel, type Logger, type LoggerOptions, type LogData } from './types';
import { LogLevel, type Logger, type LoggerOptions, type LogData } from './types';

const levelNames: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
};

function formatPrefix(level: LogLevel, context: string): string {
  const timestamp = new Date().toISOString();
  const levelName = levelNames[level];
  return `${timestamp} [${levelName}] [${context}]`;
}

function shouldLog(currentLevel: LogLevel, messageLevel: LogLevel): boolean {
  return messageLevel >= currentLevel;
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const { context = 'App', level = LogLevel.INFO } = options;

  const log = (messageLevel: LogLevel, message: string, data?: LogData): void => {
    if (!shouldLog(level, messageLevel)) {
      return;
    }

    const prefix = formatPrefix(messageLevel, context);
    const consoleMethod = getConsoleMethod(messageLevel);

    if (data !== undefined) {
      consoleMethod(prefix, message, data);
    } else {
      consoleMethod(prefix, message);
    }
  };

  const getConsoleMethod = (level: LogLevel): typeof console.log => {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.ERROR:
        return console.error;
      default:
        return console.log;
    }
  };

  return {
    debug: (message: string, data?: LogData) => log(LogLevel.DEBUG, message, data),
    info: (message: string, data?: LogData) => log(LogLevel.INFO, message, data),
    warn: (message: string, data?: LogData) => log(LogLevel.WARN, message, data),
    error: (message: string, data?: LogData) => log(LogLevel.ERROR, message, data),
    child: (subContext: string): Logger => {
      return createLogger({
        context: `${context}:${subContext}`,
        level,
      });
    },
  };
}

// Default app logger instance
export const logger = createLogger({ context: 'NFChat' });

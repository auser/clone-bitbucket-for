import winston from 'winston';
import path from 'path';
import fs from 'fs';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  VERBOSE = 'verbose'
}

export interface LoggerConfig {
  level: LogLevel;
  logToFile: boolean;
  logDir?: string | undefined;
  logFile?: string | undefined;
  consoleOutput: boolean;
}

export class Logger {
  private logger: winston.Logger;
  private config: LoggerConfig;

  constructor(config: LoggerConfig) {
    this.config = config;
    this.logger = this.createLogger();
  }

  private createLogger(): winston.Logger {
    const transports: winston.transport[] = [];

    // Console transport
    if (this.config.consoleOutput) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
              return `${timestamp} [${level}]: ${message}${metaStr}`;
            })
          )
        })
      );
    }

    // File transport
    if (this.config.logToFile) {
      const logDir = this.config.logDir || path.join(process.cwd(), 'logs');
      const logFile = this.config.logFile || 'scraper.log';

      // Ensure log directory exists
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const logFilePath = path.join(logDir, logFile);

      transports.push(
        new winston.transports.File({
          filename: logFilePath,
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.errors({ stack: true }),
            winston.format.json()
          )
        })
      );

      // Also create a separate error log file
      transports.push(
        new winston.transports.File({
          filename: path.join(logDir, 'error.log'),
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.errors({ stack: true }),
            winston.format.json()
          )
        })
      );
    }

    return winston.createLogger({
      level: this.config.level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports,
      exitOnError: false
    });
  }

  // Logging methods
  error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  verbose(message: string, meta?: any): void {
    this.logger.verbose(message, meta);
  }

  // Special methods for the scraper
  search(searchTerm: string, url: string): void {
    this.info(`🔍 Searching for "${searchTerm}" on ${url}`, { searchTerm, url });
  }

  authentication(): void {
    this.info('🔐 Authenticating with Bitbucket...');
  }

  authenticationComplete(): void {
    this.info('✅ Bitbucket 2FA completed');
  }

  scrapingPage(pageNumber: number): void {
    this.info(`📄 Scraping page ${pageNumber}...`, { pageNumber });
  }

  foundRepositories(count: number): void {
    this.info(`📁 Found ${count} repository(ies) to clone`, { count });
  }

  cloningRepository(repoName: string, index: number, total: number): void {
    this.info(`🚀 Cloning ${repoName}...`, { repoName, index, total });
  }

  cloneSuccess(repoName: string, branch?: string): void {
    const message = branch
      ? `✅ Successfully cloned ${repoName} (branch: ${branch})`
      : `✅ Successfully cloned ${repoName}`;
    this.info(message, { repoName, branch });
  }

  cloneFallback(repoName: string, requestedBranch: string): void {
    this.warn(`⚠️ Branch '${requestedBranch}' not found, falling back to default branch`, {
      repoName,
      requestedBranch
    });
  }

  cloneError(repoName: string, error: string): void {
    this.error(`❌ Failed to clone ${repoName}: ${error}`, { repoName, error });
  }

  repositoryExists(repoName: string): void {
    this.warn(`❌ ${repoName} already exists`, { repoName });
  }

  dryRun(repositories: string[]): void {
    this.info('🔍 DRY RUN - Would clone the following repositories:', { repositories });
  }

  cloningComplete(successCount: number, errorCount: number, clonePath: string): void {
    this.info('🎉 Cloning complete!', { successCount, errorCount, clonePath });
  }

  noResults(): void {
    this.warn('❌ No repositories found matching your search criteria.');
  }

  // Configuration logging
  logConfiguration(config: any): void {
    this.debug('Configuration loaded', config);
  }

  // Get log file path
  getLogFilePath(): string | null {
    if (!this.config.logToFile) return null;
    const logDir = this.config.logDir || path.join(process.cwd(), 'logs');
    const logFile = this.config.logFile || 'scraper.log';
    return path.join(logDir, logFile);
  }

  // Get error log file path
  getErrorLogFilePath(): string | null {
    if (!this.config.logToFile) return null;
    const logDir = this.config.logDir || path.join(process.cwd(), 'logs');
    return path.join(logDir, 'error.log');
  }
}

// Default logger instance
let defaultLogger: Logger | null = null;

export function createLogger(config: LoggerConfig): Logger {
  return new Logger(config);
}

export function getLogger(): Logger {
  if (!defaultLogger) {
    throw new Error('Logger not initialized. Call initializeLogger() first.');
  }
  return defaultLogger;
}

export function initializeLogger(config: LoggerConfig): Logger {
  defaultLogger = new Logger(config);
  return defaultLogger;
}

// Convenience function to get log level from string
export function getLogLevel(level: string): LogLevel {
  switch (level.toLowerCase()) {
    case 'error':
      return LogLevel.ERROR;
    case 'warn':
      return LogLevel.WARN;
    case 'info':
      return LogLevel.INFO;
    case 'debug':
      return LogLevel.DEBUG;
    case 'verbose':
      return LogLevel.VERBOSE;
    default:
      return LogLevel.INFO;
  }
} 
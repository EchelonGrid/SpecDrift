import chalk from 'chalk';

export type LogLevel = 'SILLY' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const LOG_LEVEL_PRIORITIES: Record<LogLevel, number> = {
  SILLY: 0,
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
};

const DEFAULT_LEVEL: LogLevel = 'INFO';

const getMinLogLevel = (): LogLevel => {
  const envLevel = process.env.LOG_LEVEL?.toUpperCase();
  if (envLevel && envLevel in LOG_LEVEL_PRIORITIES) {
    return envLevel as LogLevel;
  }
  return DEFAULT_LEVEL;
};

export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private shouldLog(level: LogLevel): boolean {
    const minLevel = getMinLogLevel();
    return LOG_LEVEL_PRIORITIES[level] >= LOG_LEVEL_PRIORITIES[minLevel];
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}] [${this.context}]`;
    switch (level) {
      case 'SILLY':
        return chalk.magenta(prefix) + ' ' + message;
      case 'DEBUG':
        return chalk.cyan(prefix) + ' ' + message;
      case 'INFO':
        return chalk.green(prefix) + ' ' + message;
      case 'WARN':
        return chalk.yellow(prefix) + ' ' + message;
      case 'ERROR':
        return chalk.red(prefix) + ' ' + message;
      default:
        return `${prefix} ${message}`;
    }
  }

  public silly(message: string, ...meta: any[]): void {
    if (this.shouldLog('SILLY')) {
      console.log(this.formatMessage('SILLY', message), ...meta);
    }
  }

  public debug(message: string, ...meta: any[]): void {
    if (this.shouldLog('DEBUG')) {
      console.log(this.formatMessage('DEBUG', message), ...meta);
    }
  }

  public info(message: string, ...meta: any[]): void {
    if (this.shouldLog('INFO')) {
      console.log(this.formatMessage('INFO', message), ...meta);
    }
  }

  public warn(message: string, ...meta: any[]): void {
    if (this.shouldLog('WARN')) {
      console.warn(this.formatMessage('WARN', message), ...meta);
    }
  }

  public error(message: string, ...meta: any[]): void {
    if (this.shouldLog('ERROR')) {
      console.error(this.formatMessage('ERROR', message), ...meta);
    }
  }
}

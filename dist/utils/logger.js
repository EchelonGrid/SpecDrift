import chalk from 'chalk';
const LOG_LEVEL_PRIORITIES = {
    SILLY: 0,
    DEBUG: 1,
    INFO: 2,
    WARN: 3,
    ERROR: 4,
};
const DEFAULT_LEVEL = 'INFO';
const getMinLogLevel = () => {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    if (envLevel && envLevel in LOG_LEVEL_PRIORITIES) {
        return envLevel;
    }
    return DEFAULT_LEVEL;
};
export class Logger {
    context;
    constructor(context) {
        this.context = context;
    }
    shouldLog(level) {
        const minLevel = getMinLogLevel();
        return LOG_LEVEL_PRIORITIES[level] >= LOG_LEVEL_PRIORITIES[minLevel];
    }
    formatMessage(level, message) {
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
    silly(message, ...meta) {
        if (this.shouldLog('SILLY')) {
            console.log(this.formatMessage('SILLY', message), ...meta);
        }
    }
    debug(message, ...meta) {
        if (this.shouldLog('DEBUG')) {
            console.log(this.formatMessage('DEBUG', message), ...meta);
        }
    }
    info(message, ...meta) {
        if (this.shouldLog('INFO')) {
            console.log(this.formatMessage('INFO', message), ...meta);
        }
    }
    warn(message, ...meta) {
        if (this.shouldLog('WARN')) {
            console.warn(this.formatMessage('WARN', message), ...meta);
        }
    }
    error(message, ...meta) {
        if (this.shouldLog('ERROR')) {
            console.error(this.formatMessage('ERROR', message), ...meta);
        }
    }
}

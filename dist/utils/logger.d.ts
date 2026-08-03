export type LogLevel = 'SILLY' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
export declare class Logger {
    private context;
    constructor(context: string);
    private shouldLog;
    private formatMessage;
    silly(message: string, ...meta: any[]): void;
    debug(message: string, ...meta: any[]): void;
    info(message: string, ...meta: any[]): void;
    warn(message: string, ...meta: any[]): void;
    error(message: string, ...meta: any[]): void;
}

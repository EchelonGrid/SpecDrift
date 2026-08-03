export interface ScanOptions {
    url?: string;
    dir?: string;
    spec?: string;
    output?: string;
    format?: 'json' | 'markdown';
}
export declare function runScan(options: ScanOptions): Promise<void>;

export interface FetcherConfig {
    timeoutMs?: number;
    headers?: Record<string, string>;
    userAgent?: string;
}
export declare function fetchRemoteText(url: string, config?: FetcherConfig): Promise<string | null>;

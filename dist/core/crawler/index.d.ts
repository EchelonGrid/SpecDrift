import { FetcherConfig } from './fetcher.js';
export declare function crawlRemoteTarget(targetUrl: string, config?: FetcherConfig): Promise<Map<string, string>>;
export declare function scanLocalDirectory(dirPath: string): Promise<Map<string, string>>;
export { fetchRemoteText } from './fetcher.js';
export { extractScriptUrls } from './extractor.js';
export type { FetcherConfig } from './fetcher.js';

import { readdir, readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { Logger } from '../../utils/logger.js';
import { fetchRemoteText, FetcherConfig } from './fetcher.js';
import { extractScriptUrls } from './extractor.js';

const logger = new Logger('CrawlerOrchestrator');

export async function crawlRemoteTarget(
  targetUrl: string,
  config: FetcherConfig = {}
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  logger.info(`Starting remote crawl for target: ${targetUrl}`);

  // Fetch the primary target asset/page
  const targetContent = await fetchRemoteText(targetUrl, config);
  if (!targetContent) {
    logger.warn(`Failed to fetch main target URL content: ${targetUrl}`);
    return result;
  }

  // If the target URL itself ends in .js, .ts, .jsx, store it directly
  if (/\.(js|ts|jsx|mjs|cjs)(\?.*)?$/i.test(targetUrl)) {
    result.set(targetUrl, targetContent);
    return result;
  }

  // Treat as HTML and extract linked script URLs
  const scriptUrls = extractScriptUrls(targetContent, targetUrl);
  logger.info(`Discovered ${scriptUrls.length} script URLs from target: ${targetUrl}`);

  // Download all extracted scripts concurrently
  const fetchPromises = scriptUrls.map(async (url) => {
    const code = await fetchRemoteText(url, config);
    if (code !== null) {
      result.set(url, code);
    }
  });

  await Promise.all(fetchPromises);
  logger.info(`Successfully fetched ${result.size} remote assets`);
  return result;
}

export async function scanLocalDirectory(dirPath: string): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const validExtensions = new Set(['.js', '.ts', '.jsx', '.mjs', '.cjs']);

  logger.info(`Scanning local directory: ${dirPath}`);

  async function walk(currentPath: string): Promise<void> {
    try {
      const entries = await readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(currentPath, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules and hidden folders
          if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
            continue;
          }
          await walk(fullPath);
        } else if (entry.isFile()) {
          const ext = extname(entry.name).toLowerCase();
          if (validExtensions.has(ext)) {
            try {
              const content = await readFile(fullPath, 'utf-8');
              result.set(fullPath, content);
            } catch (err: any) {
              logger.warn(`Failed to read file ${fullPath}: ${err.message || String(err)}`);
            }
          }
        }
      }
    } catch (err: any) {
      logger.warn(`Error scanning directory path ${currentPath}: ${err.message || String(err)}`);
    }
  }

  await walk(dirPath);
  logger.info(`Scanned ${result.size} files from local directory: ${dirPath}`);
  return result;
}

export { fetchRemoteText } from './fetcher.js';
export { extractScriptUrls } from './extractor.js';
export type { FetcherConfig } from './fetcher.js';

import { Logger } from '../../utils/logger.js';
const logger = new Logger('CrawlerFetcher');
const DEFAULT_USER_AGENT = 'SpecDrift/1.0 Security Scanner (+https://github.com/specdrift)';
const DEFAULT_TIMEOUT_MS = 10000;
export async function fetchRemoteText(url, config = {}) {
    const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const headers = {
        'User-Agent': config.userAgent || DEFAULT_USER_AGENT,
        Accept: 'text/html,application/javascript,text/javascript,*/*',
        ...(config.headers || {}),
    };
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
            logger.warn(`Failed to fetch asset from ${url}: HTTP status ${response.status} ${response.statusText}`, {
                url,
                status: response.status,
            });
            return null;
        }
        const text = await response.text();
        return text;
    }
    catch (error) {
        clearTimeout(timeoutId);
        const isAbort = error?.name === 'AbortError';
        const errorMsg = isAbort ? `Request timed out after ${timeoutMs}ms` : error.message || String(error);
        logger.warn(`Network fetch error for ${url}: ${errorMsg}`, {
            url,
            error: errorMsg,
        });
        return null;
    }
}

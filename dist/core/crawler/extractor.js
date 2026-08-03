import { Logger } from '../../utils/logger.js';
const logger = new Logger('CrawlerExtractor');
export function extractScriptUrls(htmlContent, baseUrl) {
    const scriptUrls = [];
    const seen = new Set();
    // Match <script ... src=["']...["'] ...> or <script ... src=... >
    const scriptRegex = /<script\b[^>]*?\bsrc\s*=\s*(?:["']([^"']+)["']|([^\s>]+))/gi;
    let match;
    while ((match = scriptRegex.exec(htmlContent)) !== null) {
        const rawSrc = match[1] || match[2];
        if (!rawSrc)
            continue;
        const trimmedSrc = rawSrc.trim();
        if (!trimmedSrc || trimmedSrc.startsWith('data:') || trimmedSrc.startsWith('blob:')) {
            continue;
        }
        try {
            const resolvedUrl = new URL(trimmedSrc, baseUrl).href;
            if (!seen.has(resolvedUrl)) {
                seen.add(resolvedUrl);
                scriptUrls.push(resolvedUrl);
            }
        }
        catch (error) {
            logger.warn(`Failed to resolve script URL: ${trimmedSrc} relative to ${baseUrl}`, {
                rawSrc: trimmedSrc,
                baseUrl,
                error: error.message || String(error),
            });
        }
    }
    return scriptUrls;
}

export function normalizeEndpoints(rawEndpoints) {
    const normalized = [];
    const seen = new Set();
    for (const raw of rawEndpoints) {
        if (!raw || typeof raw !== 'object')
            continue;
        // 1. Sanitize Path
        let rawPath = typeof raw.path === 'string' ? raw.path.trim() : '/';
        // If it is a full URL, strip protocol and hostname/port
        if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) {
            try {
                const urlObj = new URL(rawPath);
                rawPath = urlObj.pathname;
            }
            catch (e) {
                // Fallback if URL parsing fails
                rawPath = rawPath.replace(/^https?:\/\/[^\/]+/, '');
            }
        }
        // Ensure path starts with a single slash, collapse multiple slashes
        if (!rawPath.startsWith('/')) {
            rawPath = '/' + rawPath;
        }
        rawPath = rawPath.replace(/\/+/g, '/');
        if (rawPath.length > 1 && rawPath.endsWith('/')) {
            rawPath = rawPath.substring(0, rawPath.length - 1);
        }
        // 2. Sanitize Method
        let rawMethod = typeof raw.method === 'string' ? raw.method.trim().toUpperCase() : 'GET';
        const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
        if (!validMethods.includes(rawMethod)) {
            rawMethod = 'GET';
        }
        // 3. Sanitize Parameters
        const parameters = [];
        if (Array.isArray(raw.parameters)) {
            const seenParams = new Set();
            for (const p of raw.parameters) {
                if (p && typeof p === 'object' && typeof p.name === 'string') {
                    const name = p.name.trim();
                    const type = ['query', 'body', 'path', 'header'].includes(p.type) ? p.type : 'query';
                    const required = typeof p.required === 'boolean' ? p.required : true;
                    // Deduplicate parameter names per endpoint-type
                    const key = `${name}:${type}`;
                    if (name && !seenParams.has(key)) {
                        seenParams.add(key);
                        parameters.push({ name, type, required });
                    }
                }
            }
        }
        // 4. Sanitize Headers
        const headers = [];
        if (Array.isArray(raw.headers)) {
            const seenHeaders = new Set();
            for (const h of raw.headers) {
                if (typeof h === 'string') {
                    const cleanedHeader = h.trim();
                    if (cleanedHeader && !seenHeaders.has(cleanedHeader.toLowerCase())) {
                        seenHeaders.add(cleanedHeader.toLowerCase());
                        headers.push(cleanedHeader);
                    }
                }
            }
        }
        // 5. Physical fields
        const sourceFile = typeof raw.sourceFile === 'string' ? raw.sourceFile.trim() : 'unknown';
        const lineLocation = typeof raw.lineLocation === 'number' && !isNaN(raw.lineLocation) ? raw.lineLocation : 1;
        const endpoint = {
            path: rawPath,
            method: rawMethod,
            parameters,
            headers,
            sourceFile,
            lineLocation,
        };
        // Deduplicate identical findings
        const uniqueKey = `${endpoint.method}:${endpoint.path}:${endpoint.sourceFile}:${endpoint.lineLocation}`;
        if (!seen.has(uniqueKey)) {
            seen.add(uniqueKey);
            normalized.push(endpoint);
        }
    }
    return normalized;
}

import SwaggerParser from '@apidevtools/swagger-parser';
import { Logger } from '../../utils/logger.js';
const logger = new Logger('SpecParser');
export function normalizeSpecPath(path) {
    let p = path.trim();
    if (!p.startsWith('/')) {
        p = '/' + p;
    }
    p = p.replace(/\/+/g, '/');
    if (p.length > 1 && p.endsWith('/')) {
        p = p.substring(0, p.length - 1);
    }
    // Replace any {parameterName} with {param} for pattern matching
    return p.replace(/\{[^}]+\}/g, '{param}');
}
export async function parseOpenAPISpec(specPath) {
    const routes = [];
    try {
        const api = await SwaggerParser.dereference(specPath);
        if (!api || typeof api !== 'object' || !api.paths) {
            logger.warn(`OpenAPI specification at ${specPath} contains no valid paths object.`);
            return routes;
        }
        const validMethods = new Set(['get', 'post', 'put', 'delete', 'patch', 'options']);
        for (const [pathStr, pathItemObj] of Object.entries(api.paths)) {
            if (!pathItemObj || typeof pathItemObj !== 'object')
                continue;
            const pathItem = pathItemObj;
            const normalizedPath = normalizeSpecPath(pathStr);
            for (const [methodKey, operationObj] of Object.entries(pathItem)) {
                const lowerMethod = methodKey.toLowerCase();
                if (!validMethods.has(lowerMethod))
                    continue;
                const operation = operationObj;
                const method = lowerMethod.toUpperCase();
                // Check deprecation at operation level or path level
                const isDeprecated = Boolean(operation?.deprecated || pathItem?.deprecated);
                routes.push({
                    rawPath: pathStr,
                    normalizedPath,
                    method,
                    isDeprecated,
                    summary: operation?.summary || operation?.description,
                });
            }
        }
        logger.info(`Successfully parsed ${routes.length} routes from OpenAPI spec: ${specPath}`);
        return routes;
    }
    catch (error) {
        logger.warn(`Failed to parse OpenAPI spec file: ${specPath}. Error: ${error.message || error}`, {
            specPath,
            error,
        });
        return [];
    }
}

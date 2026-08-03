import { parseSourceCode } from './parser.js';
import { traverseAST } from './traverse.js';
import { normalizeEndpoints } from './normalizer.js';
export function extractEndpointsFromCode(code, filePath) {
    const ast = parseSourceCode(code, filePath);
    if (!ast) {
        return [];
    }
    const rawEndpoints = traverseAST(ast, filePath);
    return normalizeEndpoints(rawEndpoints);
}

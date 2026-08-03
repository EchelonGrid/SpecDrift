import { parse } from '@babel/parser';
import { Logger } from '../../utils/logger.js';
const logger = new Logger('ASTParser');
export function parseSourceCode(code, filePath) {
    const options = {
        sourceType: 'module',
        plugins: [
            'typescript',
            'jsx',
            'decorators-legacy',
            'classProperties',
            'dynamicImport',
        ],
    };
    try {
        return parse(code, options);
    }
    catch (error) {
        logger.warn(`Failed to parse file: ${filePath}. Error: ${error.message || error}`, {
            filePath,
            error,
        });
        return null;
    }
}

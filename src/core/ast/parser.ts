import { parse, ParserOptions } from '@babel/parser';
import * as t from '@babel/types';
import { Logger } from '../../utils/logger.js';

const logger = new Logger('ASTParser');

export function parseSourceCode(code: string, filePath: string): t.File | null {
  const options: ParserOptions = {
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
  } catch (error: any) {
    logger.warn(`Failed to parse file: ${filePath}. Error: ${error.message || error}`, {
      filePath,
      error,
    });
    return null;
  }
}

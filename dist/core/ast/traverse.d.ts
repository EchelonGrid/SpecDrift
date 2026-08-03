import * as t from '@babel/types';
import { ExtractedEndpoint } from '../../types/endpoint.js';
export declare function traverseAST(ast: t.File, sourceFile: string): ExtractedEndpoint[];

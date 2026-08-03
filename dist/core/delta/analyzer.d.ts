import { ExtractedEndpoint, AnalysisResult } from '../../types/endpoint.js';
export declare function analyzeDrift(extracted: ExtractedEndpoint[], specPath?: string): Promise<AnalysisResult[]>;

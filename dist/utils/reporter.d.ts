import { AnalysisResult } from '../types/endpoint.js';
export declare function printTerminalSummary(results: AnalysisResult[]): void;
export declare function exportReportToFile(results: AnalysisResult[], outputPath: string, format?: 'json' | 'markdown'): Promise<void>;

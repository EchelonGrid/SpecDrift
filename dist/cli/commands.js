import { Logger } from '../utils/logger.js';
import { crawlRemoteTarget, scanLocalDirectory } from '../core/crawler/index.js';
import { extractEndpointsFromCode } from '../core/ast/index.js';
import { analyzeDrift } from '../core/delta/index.js';
import { printTerminalSummary, exportReportToFile } from '../utils/reporter.js';
const logger = new Logger('CLICommand');
export async function runScan(options) {
    const startTime = Date.now();
    if (!options.url && !options.dir) {
        logger.error('No target input specified. You must provide either --url <url> or --dir <dir> to run a scan.');
        return;
    }
    try {
        // Step 1: Target Asset Ingestion
        let assetMap = new Map();
        if (options.url) {
            logger.info(`Initiating ingestion for remote target URL: ${options.url}`);
            assetMap = await crawlRemoteTarget(options.url);
        }
        else if (options.dir) {
            logger.info(`Initiating ingestion for local directory: ${options.dir}`);
            assetMap = await scanLocalDirectory(options.dir);
        }
        if (assetMap.size === 0) {
            logger.warn('Ingestion completed, but zero target files were retrieved.');
            return;
        }
        // Step 2: AST Static Analysis Extraction
        logger.info(`Running AST Static Analysis engine across ${assetMap.size} asset(s)...`);
        const allExtractedEndpoints = [];
        for (const [filePath, sourceCode] of assetMap.entries()) {
            const endpoints = extractEndpointsFromCode(sourceCode, filePath);
            allExtractedEndpoints.push(...endpoints);
        }
        logger.info(`AST Extraction complete. Found ${allExtractedEndpoints.length} total raw API route call(s).`);
        // Step 3: Delta Spec Matching & Drift Analysis
        const analysisResults = await analyzeDrift(allExtractedEndpoints, options.spec);
        // Step 4: Terminal Reporting & Optional File Export
        printTerminalSummary(analysisResults);
        if (options.output) {
            const format = options.format === 'markdown' ? 'markdown' : 'json';
            await exportReportToFile(analysisResults, options.output, format);
        }
        const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
        logger.info(`SpecDrift scan completed successfully in ${durationSec}s.`);
    }
    catch (error) {
        logger.error(`Critical failure during scan execution: ${error.message || error}`, { error });
    }
}

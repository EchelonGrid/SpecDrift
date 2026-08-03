import { ExtractedEndpoint, AnalysisResult } from '../../types/endpoint.js';
import { parseOpenAPISpec, SpecRoute } from './parser.js';
import { matchEndpointWithSpec } from './matcher.js';
import { Logger } from '../../utils/logger.js';

const logger = new Logger('DriftAnalyzer');

export async function analyzeDrift(
  extracted: ExtractedEndpoint[],
  specPath?: string
): Promise<AnalysisResult[]> {
  const results: AnalysisResult[] = [];

  let specRoutes: SpecRoute[] = [];
  let isSpecLoaded = false;

  if (specPath) {
    logger.info(`Analyzing drift against OpenAPI specification: ${specPath}`);
    specRoutes = await parseOpenAPISpec(specPath);
    isSpecLoaded = true;
  } else {
    logger.info('No OpenAPI specification path provided. Operating in Recon Mode.');
  }

  for (const endpoint of extracted) {
    if (!isSpecLoaded) {
      // Recon mode / Fallback
      results.push({
        ...endpoint,
        status: 'SHADOW',
        remediationHint: 'No OpenAPI specification supplied (Recon Mode). Endpoint extracted from source code.',
      });
      continue;
    }

    const match = matchEndpointWithSpec(endpoint, specRoutes);

    if (match) {
      if (match.isDeprecated) {
        results.push({
          ...endpoint,
          status: 'ZOMBIE',
          remediationHint: `Endpoint matches deprecated spec route '${match.rawPath}'. Deprecated in schema; migrate client callers away from this API.`,
        });
      } else {
        results.push({
          ...endpoint,
          status: 'DOCUMENTED',
          remediationHint: `Endpoint matches official spec route '${match.rawPath}'.`,
        });
      }
    } else {
      results.push({
        ...endpoint,
        status: 'SHADOW',
        remediationHint: `Active client endpoint missing from OpenAPI specification. Document '${endpoint.path}' [${endpoint.method}] in schema.`,
      });
    }
  }

  logger.info(`Drift analysis complete. Processed ${results.length} endpoints.`);
  return results;
}

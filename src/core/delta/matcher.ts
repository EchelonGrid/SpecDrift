import { ExtractedEndpoint } from '../../types/endpoint.js';
import { SpecRoute, normalizeSpecPath } from './parser.js';

export function matchEndpointWithSpec(
  endpoint: ExtractedEndpoint,
  specRoutes: SpecRoute[]
): SpecRoute | null {
  const normEndpointPath = normalizeSpecPath(endpoint.path);
  const endpointMethod = endpoint.method.toUpperCase();

  // 1. Exact match on normalized path and method
  for (const specRoute of specRoutes) {
    if (
      specRoute.method.toUpperCase() === endpointMethod &&
      specRoute.normalizedPath === normEndpointPath
    ) {
      return specRoute;
    }
  }

  // 2. Segment-by-segment parameter matching (fuzzy fallback)
  const endpointSegments = normEndpointPath.split('/').filter(Boolean);

  for (const specRoute of specRoutes) {
    if (specRoute.method.toUpperCase() !== endpointMethod) {
      continue;
    }

    const specSegments = specRoute.normalizedPath.split('/').filter(Boolean);
    if (specSegments.length !== endpointSegments.length) {
      continue;
    }

    let isMatch = true;
    for (let i = 0; i < specSegments.length; i++) {
      const specSeg = specSegments[i];
      const endSeg = endpointSegments[i];

      // If segment is a parameter in either path (e.g. {param} or {id} or dynamic var)
      const isSpecParam = specSeg.startsWith('{') && specSeg.endsWith('}');
      const isEndParam = endSeg.startsWith('{') && endSeg.endsWith('}');

      if (isSpecParam || isEndParam) {
        // Parameter positions match structurally
        continue;
      }

      if (specSeg.toLowerCase() !== endSeg.toLowerCase()) {
        isMatch = false;
        break;
      }
    }

    if (isMatch) {
      return specRoute;
    }
  }

  return null;
}

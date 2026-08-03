import { ExtractedEndpoint } from '../../types/endpoint.js';
import { SpecRoute } from './parser.js';
export declare function matchEndpointWithSpec(endpoint: ExtractedEndpoint, specRoutes: SpecRoute[]): SpecRoute | null;

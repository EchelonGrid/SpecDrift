export interface SpecRoute {
    rawPath: string;
    normalizedPath: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS';
    isDeprecated: boolean;
    summary?: string;
}
export declare function normalizeSpecPath(path: string): string;
export declare function parseOpenAPISpec(specPath: string): Promise<SpecRoute[]>;

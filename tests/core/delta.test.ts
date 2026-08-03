import { describe, it, expect } from 'vitest';
import { analyzeDrift, parseOpenAPISpec, matchEndpointWithSpec } from '../../src/core/delta/index.js';
import { ExtractedEndpoint } from '../../src/types/endpoint.js';
import { writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('Delta Engine & Spec Parser', () => {
  const sampleOpenAPI = {
    openapi: '3.0.0',
    info: { title: 'Test API', version: '1.0.0' },
    paths: {
      '/api/v1/users': {
        get: { summary: 'List users' },
        post: { summary: 'Create user' },
      },
      '/api/v1/users/{id}': {
        get: { summary: 'Get user by ID' },
      },
      '/api/v1/legacy': {
        get: { summary: 'Deprecated legacy endpoint', deprecated: true },
      },
    },
  };

  it('should parse OpenAPI JSON spec correctly', async () => {
    const tempFile = join(tmpdir(), `openapi-test-${Date.now()}.json`);
    await writeFile(tempFile, JSON.stringify(sampleOpenAPI));

    try {
      const routes = await parseOpenAPISpec(tempFile);
      expect(routes).toHaveLength(4);
      expect(routes.find((r) => r.rawPath === '/api/v1/legacy')?.isDeprecated).toBe(true);
      expect(routes.find((r) => r.rawPath === '/api/v1/users/{id}')?.normalizedPath).toBe('/api/v1/users/{param}');
    } finally {
      await rm(tempFile, { force: true });
    }
  });

  it('should match dynamic parameter routes correctly', () => {
    const specRoutes = [
      { rawPath: '/api/v1/users/{userId}', normalizedPath: '/api/v1/users/{param}', method: 'GET' as const, isDeprecated: false },
    ];

    const endpoint: ExtractedEndpoint = {
      path: '/api/v1/users/{id}',
      method: 'GET',
      parameters: [],
      headers: [],
      sourceFile: 'app.js',
      lineLocation: 10,
    };

    const match = matchEndpointWithSpec(endpoint, specRoutes);
    expect(match).not.toBeNull();
    expect(match?.rawPath).toBe('/api/v1/users/{userId}');
  });

  it('should classify drift into DOCUMENTED, ZOMBIE, and SHADOW', async () => {
    const tempFile = join(tmpdir(), `openapi-drift-${Date.now()}.json`);
    await writeFile(tempFile, JSON.stringify(sampleOpenAPI));

    const endpoints: ExtractedEndpoint[] = [
      { path: '/api/v1/users', method: 'GET', parameters: [], headers: [], sourceFile: 'main.js', lineLocation: 5 },
      { path: '/api/v1/legacy', method: 'GET', parameters: [], headers: [], sourceFile: 'main.js', lineLocation: 15 },
      { path: '/api/v1/secret', method: 'POST', parameters: [], headers: [], sourceFile: 'main.js', lineLocation: 25 },
    ];

    try {
      const results = await analyzeDrift(endpoints, tempFile);
      expect(results).toHaveLength(3);

      const docResult = results.find((r) => r.path === '/api/v1/users');
      expect(docResult?.status).toBe('DOCUMENTED');

      const zombieResult = results.find((r) => r.path === '/api/v1/legacy');
      expect(zombieResult?.status).toBe('ZOMBIE');

      const shadowResult = results.find((r) => r.path === '/api/v1/secret');
      expect(shadowResult?.status).toBe('SHADOW');
    } finally {
      await rm(tempFile, { force: true });
    }
  });

  it('should handle Recon Mode gracefully when no spec is supplied', async () => {
    const endpoints: ExtractedEndpoint[] = [
      { path: '/api/v1/users', method: 'GET', parameters: [], headers: [], sourceFile: 'main.js', lineLocation: 5 },
    ];

    const results = await analyzeDrift(endpoints);
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('SHADOW');
    expect(results[0].remediationHint).toContain('Recon Mode');
  });
});

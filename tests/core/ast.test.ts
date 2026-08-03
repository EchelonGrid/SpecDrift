import { describe, it, expect } from 'vitest';
import { extractEndpointsFromCode } from '../../src/core/ast/index.js';

describe('AST Static Analysis Engine', () => {
  it('should parse simple fetch call correctly', () => {
    const code = `
      fetch('/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer token' },
        body: JSON.stringify({ name: 'Alice' })
      });
    `;
    const results = extractEndpointsFromCode(code, 'test-fetch.js');
    expect(results).toHaveLength(1);
    expect(results[0].path).toBe('/api/v1/users');
    expect(results[0].method).toBe('POST');
    expect(results[0].headers).toContain('Content-Type');
    expect(results[0].headers).toContain('Authorization');
  });

  it('should resolve variable and trace scope for URL path', () => {
    const code = `
      const apiPrefix = '/api/v1';
      const endpoint = apiPrefix + '/items';
      fetch(endpoint);
    `;
    const results = extractEndpointsFromCode(code, 'test-scope.js');
    expect(results).toHaveLength(1);
    expect(results[0].path).toBe('/api/v1/items');
    expect(results[0].method).toBe('GET');
  });

  it('should normalize template literals and extract path parameter name', () => {
    const code = `
      const userId = '123';
      axios.get(\`/api/users/\${userId}\`);
    `;
    const results = extractEndpointsFromCode(code, 'test-template.js');
    expect(results).toHaveLength(1);
    expect(results[0].path).toBe('/api/users/{userId}');
    expect(results[0].method).toBe('GET');
    expect(results[0].parameters).toHaveLength(1);
    expect(results[0].parameters[0]).toEqual({
      name: 'userId',
      type: 'path',
      required: true
    });
  });

  it('should parse Axios configurations and data params', () => {
    const code = `
      axios.post('/api/users', { email: 'test@example.com' }, {
        headers: { 'X-Custom': 'Value' }
      });
    `;
    const results = extractEndpointsFromCode(code, 'test-axios.js');
    expect(results).toHaveLength(1);
    expect(results[0].path).toBe('/api/users');
    expect(results[0].method).toBe('POST');
    expect(results[0].headers).toContain('X-Custom');
    expect(results[0].parameters).toContainEqual({
      name: 'email',
      type: 'body',
      required: true
    });
  });

  it('should parse XMLHttpRequest operations', () => {
    const code = `
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', '/api/resource?id=123');
      xhr.setRequestHeader('X-Request-Id', 'uuid');
      xhr.send(JSON.stringify({ value: 'foo' }));
    `;
    const results = extractEndpointsFromCode(code, 'test-xhr.js');
    expect(results).toHaveLength(1);
    expect(results[0].path).toBe('/api/resource');
    expect(results[0].method).toBe('PUT');
    expect(results[0].headers).toContain('X-Request-Id');
    expect(results[0].parameters).toContainEqual({
      name: 'id',
      type: 'query',
      required: true
    });
    expect(results[0].parameters).toContainEqual({
      name: 'value',
      type: 'body',
      required: true
    });
  });

  it('should normalize paths containing absolute domains or double slashes', () => {
    const code = `
      fetch('https://api.example.com//v1/endpoints/');
    `;
    const results = extractEndpointsFromCode(code, 'test-norm.js');
    expect(results).toHaveLength(1);
    expect(results[0].path).toBe('/v1/endpoints');
  });

  it('should catch parsing errors and return an empty array without crashing', () => {
    const invalidCode = `
      const val = ;
    `;
    const results = extractEndpointsFromCode(invalidCode, 'test-invalid.js');
    expect(results).toEqual([]);
  });
});

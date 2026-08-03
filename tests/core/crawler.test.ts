import { describe, it, expect, vi } from 'vitest';
import { extractScriptUrls, scanLocalDirectory, crawlRemoteTarget } from '../../src/core/crawler/index.js';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('Crawler Engine', () => {
  describe('extractScriptUrls', () => {
    it('should extract relative and absolute script URLs correctly', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <script src="/static/js/main.js"></script>
          <script src="chunk.js"></script>
          <script src="https://cdn.example.com/vendor.js"></script>
        </head>
        <body></body>
        </html>
      `;
      const baseUrl = 'https://example.com/app/index.html';
      const urls = extractScriptUrls(html, baseUrl);

      expect(urls).toContain('https://example.com/static/js/main.js');
      expect(urls).toContain('https://example.com/app/chunk.js');
      expect(urls).toContain('https://cdn.example.com/vendor.js');
    });
  });

  describe('scanLocalDirectory', () => {
    it('should recursively scan directory and read JS/TS source files', async () => {
      const tempDir = join(tmpdir(), `specdrift-test-${Date.now()}`);
      const subDir = join(tempDir, 'src');

      await mkdir(subDir, { recursive: true });
      const file1 = join(tempDir, 'index.js');
      const file2 = join(subDir, 'app.ts');
      const file3 = join(tempDir, 'readme.txt');

      await writeFile(file1, 'console.log("hello");');
      await writeFile(file2, 'const x: number = 10;');
      await writeFile(file3, 'Ignore this text file');

      try {
        const fileMap = await scanLocalDirectory(tempDir);
        expect(fileMap.size).toBe(2);
        expect(fileMap.has(file1)).toBe(true);
        expect(fileMap.has(file2)).toBe(true);
        expect(fileMap.has(file3)).toBe(false);
        expect(fileMap.get(file1)).toBe('console.log("hello");');
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('crawlRemoteTarget', () => {
    it('should handle direct script URL targets', async () => {
      const globalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('console.log("direct script");'),
      } as any);

      try {
        const fileMap = await crawlRemoteTarget('https://example.com/bundle.js');
        expect(fileMap.size).toBe(1);
        expect(fileMap.get('https://example.com/bundle.js')).toBe('console.log("direct script");');
      } finally {
        globalThis.fetch = globalFetch;
      }
    });
  });
});

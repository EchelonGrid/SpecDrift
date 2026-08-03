import { describe, it, expect } from 'vitest';
import { printTerminalSummary, exportReportToFile } from '../../src/utils/reporter.js';
import { runScan } from '../../src/cli/commands.js';
import { AnalysisResult } from '../../src/types/endpoint.js';
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('Reporter & CLI Integration', () => {
  const sampleResults: AnalysisResult[] = [
    {
      path: '/api/v1/users',
      method: 'GET',
      parameters: [],
      headers: [],
      sourceFile: 'src/app.js',
      lineLocation: 10,
      status: 'DOCUMENTED',
      remediationHint: 'Matches OpenAPI spec route',
    },
    {
      path: '/api/v1/secret',
      method: 'POST',
      parameters: [{ name: 'key', type: 'query', required: true }],
      headers: ['Authorization'],
      sourceFile: 'src/auth.js',
      lineLocation: 25,
      status: 'SHADOW',
      remediationHint: 'Undocumented active endpoint found',
    },
  ];

  it('should print terminal summary without throwing', () => {
    expect(() => printTerminalSummary(sampleResults)).not.toThrow();
  });

  it('should export JSON report to file', async () => {
    const tempFile = join(tmpdir(), `report-test-${Date.now()}.json`);
    try {
      await exportReportToFile(sampleResults, tempFile, 'json');
      const content = await readFile(tempFile, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.summary.total).toBe(2);
      expect(parsed.summary.shadow).toBe(1);
      expect(parsed.summary.documented).toBe(1);
      expect(parsed.results).toHaveLength(2);
    } finally {
      await rm(tempFile, { force: true });
    }
  });

  it('should export Markdown report to file', async () => {
    const tempFile = join(tmpdir(), `report-test-${Date.now()}.md`);
    try {
      await exportReportToFile(sampleResults, tempFile, 'markdown');
      const content = await readFile(tempFile, 'utf-8');

      expect(content).toContain('# 🛡️ SpecDrift Analysis Report');
      expect(content).toContain('/api/v1/secret');
      expect(content).toContain('**SHADOW**');
    } finally {
      await rm(tempFile, { force: true });
    }
  });

  it('should execute end-to-end runScan on local test directory', async () => {
    const tempDir = join(tmpdir(), `scan-test-${Date.now()}`);
    const outputFile = join(tempDir, 'out.json');

    await mkdir(tempDir, { recursive: true });
    const codeFile = join(tempDir, 'index.js');
    await writeFile(codeFile, `fetch('/api/v1/items');`);

    try {
      await runScan({
        dir: tempDir,
        output: outputFile,
        format: 'json',
      });

      const reportContent = await readFile(outputFile, 'utf-8');
      const parsed = JSON.parse(reportContent);
      expect(parsed.summary.total).toBe(1);
      expect(parsed.results[0].path).toBe('/api/v1/items');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

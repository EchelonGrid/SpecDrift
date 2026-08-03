import Table from 'cli-table3';
import chalk from 'chalk';
import { writeFile } from 'node:fs/promises';
import { AnalysisResult, DriftStatus } from '../types/endpoint.js';
import { Logger } from './logger.js';

const logger = new Logger('Reporter');

function formatStatus(status: DriftStatus): string {
  switch (status) {
    case 'SHADOW':
      return chalk.bold.red('SHADOW');
    case 'ZOMBIE':
      return chalk.bold.yellow('ZOMBIE');
    case 'DOCUMENTED':
      return chalk.bold.green('DOCUMENTED');
    default:
      return status;
  }
}

export function printTerminalSummary(results: AnalysisResult[]): void {
  const total = results.length;
  const shadowCount = results.filter((r) => r.status === 'SHADOW').length;
  const zombieCount = results.filter((r) => r.status === 'ZOMBIE').length;
  const docCount = results.filter((r) => r.status === 'DOCUMENTED').length;

  console.log('\n' + chalk.bold.cyan('=== SpecDrift Analysis Summary ==='));

  // 1. Summary Box Table
  const summaryTable = new Table({
    head: [
      chalk.bold('Total Endpoints'),
      chalk.bold.red('Shadow APIs'),
      chalk.bold.yellow('Zombie APIs'),
      chalk.bold.green('Documented APIs'),
    ],
  });

  summaryTable.push([
    total.toString(),
    shadowCount.toString(),
    zombieCount.toString(),
    docCount.toString(),
  ]);

  console.log(summaryTable.toString());
  console.log('');

  if (total === 0) {
    console.log(chalk.gray('No API endpoints were extracted from the target assets.\n'));
    return;
  }

  // 2. Detailed Routes Table
  console.log(chalk.bold.cyan('=== Discovered API Routes & Drift Status ==='));

  const detailsTable = new Table({
    head: [
      chalk.bold('Method'),
      chalk.bold('Path / Route Signature'),
      chalk.bold('Status'),
      chalk.bold('Source Location'),
      chalk.bold('Remediation Hint'),
    ],
    colWidths: [10, 32, 14, 25, 40],
    wordWrap: true,
  });

  for (const r of results) {
    const methodStr = chalk.bold(r.method);
    const statusStr = formatStatus(r.status);
    const locationStr = `${r.sourceFile}:${r.lineLocation}`;
    const hintStr = r.remediationHint || '-';

    detailsTable.push([methodStr, r.path, statusStr, locationStr, hintStr]);
  }

  console.log(detailsTable.toString() + '\n');
}

export async function exportReportToFile(
  results: AnalysisResult[],
  outputPath: string,
  format: 'json' | 'markdown' = 'json'
): Promise<void> {
  try {
    let content = '';

    if (format === 'markdown') {
      const total = results.length;
      const shadowCount = results.filter((r) => r.status === 'SHADOW').length;
      const zombieCount = results.filter((r) => r.status === 'ZOMBIE').length;
      const docCount = results.filter((r) => r.status === 'DOCUMENTED').length;

      content = `# 🛡️ SpecDrift Analysis Report\n\n`;
      content += `**Generated At:** ${new Date().toISOString()}\n\n`;
      content += `## 📊 Executive Summary\n\n`;
      content += `| Metric | Count |\n`;
      content += `| :--- | :--- |\n`;
      content += `| **Total Discovered Endpoints** | ${total} |\n`;
      content += `| **👻 Shadow APIs (Undocumented)** | ${shadowCount} |\n`;
      content += `| **🧟 Zombie APIs (Deprecated)** | ${zombieCount} |\n`;
      content += `| **✅ Documented APIs** | ${docCount} |\n\n`;

      content += `## 🔍 Detailed Route Findings\n\n`;
      content += `| Method | Path | Status | Source Location | Remediation Hint |\n`;
      content += `| :--- | :--- | :--- | :--- | :--- |\n`;

      for (const r of results) {
        const hint = (r.remediationHint || '-').replace(/\|/g, '\\|');
        content += `| \`${r.method}\` | \`${r.path}\` | **${r.status}** | \`${r.sourceFile}:${r.lineLocation}\` | ${hint} |\n`;
      }
    } else {
      // JSON format
      content = JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          summary: {
            total: results.length,
            shadow: results.filter((r) => r.status === 'SHADOW').length,
            zombie: results.filter((r) => r.status === 'ZOMBIE').length,
            documented: results.filter((r) => r.status === 'DOCUMENTED').length,
          },
          results,
        },
        null,
        2
      );
    }

    await writeFile(outputPath, content, 'utf-8');
    logger.info(`Successfully exported analysis report to: ${outputPath} (${format.toUpperCase()})`);
  } catch (error: any) {
    logger.error(`Failed to write report export file to ${outputPath}: ${error.message || error}`);
  }
}

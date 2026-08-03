import { Command } from 'commander';
import { runScan, ScanOptions } from './commands.js';
import chalk from 'chalk';

const banner = chalk.cyan(`
  ____                     ____   _   _   __  _   
 / ___|  _ __    ___   ___|  _ \\ | | (_) / _| | |_ 
 \\___ \\ | '_ \\  / _ \\ / __| | | || | | || |_  | __|
  ___) || |_) ||  __/| (__| |_| || | | ||  _| | |_ 
 |____/ | .__/  \\___| \\___|____/ |_| |_||_|    \\__|
        |_|                                        
`);

const program = new Command();

program
  .name('specdrift')
  .description('AST-driven API Leakage & Drift Analysis Engine')
  .version('1.0.0')
  .option('-u, --url <url>', 'Target remote web application URL')
  .option('-d, --dir <dir>', 'Target local directory path containing JS/TS build files')
  .option('-s, --spec <path>', 'Path to OpenAPI/Swagger specification JSON/YAML file')
  .option('-o, --output <path>', 'Output file path for saving report')
  .option('-f, --format <format>', 'Report output format: json or markdown', 'json')
  .action(async (options: ScanOptions) => {
    console.log(banner);
    await runScan(options);
  });

program.parse(process.argv);

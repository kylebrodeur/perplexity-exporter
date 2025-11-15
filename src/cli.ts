#!/usr/bin/env node

import { Command } from 'commander';
import type { BrowserConfig, ExportConfig } from './types/index.js';
import { ExportCommand, SetupCommand } from './commands/index.js';

/**
 * Perplexity Exporter CLI
 *
 * TypeScript-based CLI for exporting Perplexity AI threads and collections
 */

const program = new Command();

program
  .name('perplexity-exporter')
  .description('Export threads and collections from Perplexity AI')
  .version('2.0.0');

/**
 * Setup command - one-time browser configuration
 */
program
  .command('setup')
  .description('One-time setup: authenticate and save cookies')
  .option('--headless', 'Run browser in headless mode', false)
  .option('--browser <type>', 'Browser type (chromium)', 'chromium')
  .action(async (options) => {
    const browserConfig: BrowserConfig = {
      browserType: options.browser,
      headless: options.headless,
      viewport: { width: 1280, height: 720 },
      locale: 'en-US',
      timeoutMs: 60000,
      stealth: true,
      allowDownloads: false,
    };

    const exportConfig: ExportConfig = {
      outputDir: './exported-data',
      includeThreads: false,
      includeCollections: false,
      includeCitations: false,
      respectRateLimits: true,
      concurrency: 1,
      waitForNetworkIdleMs: 1000,
      dryRun: false,
      logLevel: 'info',
      perplexityBaseUrl: 'https://www.perplexity.ai',
      retry: {
        attempts: 3,
        delayMs: 1000,
        backoffFactor: 2,
        jitterMs: 250,
      },
    };

    const command = new SetupCommand(browserConfig, exportConfig);
    await command.run();
  });

/**
 * Export command - export threads and collections
 */
program
  .command('export')
  .description('Export all threads and collections')
  .option('-o, --output <dir>', 'Output directory', './exported-data')
  .option('--threads', 'Include thread details', true)
  .option('--collections', 'Include collection details', true)
  .option('--max-threads <number>', 'Maximum threads to fetch', '1000')
  .option('--headless', 'Run browser in headless mode', true)
  .option('--dry-run', 'Test mode - only fetch first few items', false)
  .action(async (options) => {
    const browserConfig: BrowserConfig = {
      browserType: 'chromium',
      headless: options.headless,
      viewport: { width: 1280, height: 720 },
      locale: 'en-US',
      timeoutMs: 60000,
      stealth: true,
      allowDownloads: false,
    };

    const exportConfig: ExportConfig = {
      outputDir: options.output,
      includeThreads: options.threads,
      includeCollections: options.collections,
      includeCitations: true,
      respectRateLimits: true,
      concurrency: 2,
      waitForNetworkIdleMs: 1000,
      maxThreads: parseInt(options.maxThreads, 10),
      dryRun: options.dryRun,
      logLevel: 'info',
      perplexityBaseUrl: 'https://www.perplexity.ai',
      retry: {
        attempts: 3,
        delayMs: 1000,
        backoffFactor: 2,
        jitterMs: 250,
      },
    };

    const command = new ExportCommand(browserConfig, exportConfig);
    await command.run();
  });

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

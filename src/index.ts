/**
 * Perplexity Exporter
 *
 * Automated export tool for Perplexity.ai threads with full conversation history.
 * Entry point — see src/exporter.ts for orchestration logic.
 */

import { launchBrowser } from './browser/context.js';
import { runExport } from './exporter.js';

async function main(): Promise<void> {
  console.log('🚀 Perplexity Exporter\n');

  const context = await launchBrowser();
  try {
    await runExport(context);
  } finally {
    await context.close();
  }
}

main().catch(console.error);

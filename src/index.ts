/**
 * Perplexity Exporter
 *
 * Automated export tool for Perplexity.ai threads with full conversation history.
 * Entry point — see src/exporter.ts for orchestration logic.
 */

import { launchBrowser } from './browser/context.js';
import { runExport } from './exporter.js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const HELP = `Perplexity Exporter — export all Perplexity.ai threads to JSON.

Usage:
  npx perplexity-exporter          Run the export.
  npx perplexity-exporter --help   Show this message.
  npx perplexity-exporter --version
                                   Print the version.

The tool opens a Chromium window, waits for you to log in, loads every
thread in your Perplexity library, and writes one timestamped JSON file.

Options:
  --help, -h       Show this message and exit.
  --version, -v    Print the version and exit.
`;

/**
 * Handle the flags that do not need the browser.
 *
 * Returns true when the flag was handled and the process should exit.
 * A flag that is not recognised is an error, not a silent no-op: this tool
 * launches a browser and waits for a keypress, so a typo would otherwise
 * look like it hung.
 */
function handleFlags(argv: string[]): boolean {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(HELP);
    return true;
  }
  if (argv.includes('--version') || argv.includes('-v')) {
    console.log(require('../package.json').version);
    return true;
  }
  const unknown = argv.filter((a) => a.startsWith('-'));
  if (unknown.length > 0) {
    console.error(`Unknown option: ${unknown.join(', ')}\n`);
    console.error(HELP);
    process.exitCode = 2;
    return true;
  }
  return false;
}

async function main(): Promise<void> {
  if (handleFlags(process.argv.slice(2))) return;

  console.log('🚀 Perplexity Exporter\n');

  const context = await launchBrowser();
  try {
    await runExport(context);
  } finally {
    await context.close();
  }
}

main().catch(console.error);

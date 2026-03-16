import type { BrowserContext } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { createStatusBadge } from './browser/status-badge.js';
import { BrowserConsole } from './browser/console-overlay.js';
import { autoScrollToLoadAll } from './browser/scroller.js';
import { ensureLoggedIn, navigateToLibrary } from './perplexity/auth.js';
import { scrapeThreadLinks } from './perplexity/library.js';
import { exportThreads } from './perplexity/export.js';
import { printSummary } from './cli/output.js';
import { promptSaveLocation } from './cli/prompt.js';
import { resolveSavePath } from './utils/paths.js';

export async function runExport(context: BrowserContext): Promise<void> {
  const page = context.pages()[0] ?? (await context.newPage());

  console.log('📋 Steps:');
  console.log('   1. Browser opened');
  console.log('   2. Navigating to Perplexity Library...\n');

  await page.goto('https://www.perplexity.ai', { waitUntil: 'domcontentloaded' });
  await ensureLoggedIn(page);
  await navigateToLibrary(page);

  await createStatusBadge(page);

  console.log('📜 Scrolling to load all threads...');
  console.log('   💡 This may take a while for large libraries\n');

  await autoScrollToLoadAll(page);

  console.log('\n💉 Injecting and running export script...\n');
  await page.waitForTimeout(1000);

  const threads = await scrapeThreadLinks(page);

  const overlay = new BrowserConsole(page);
  await overlay.mount();

  const result = await exportThreads(page, threads, overlay);
  printSummary(result);

  if (result.success && result.data) {
    const saveDir = await promptSaveLocation(page, overlay);
    const actualPath = resolveSavePath(saveDir);

    console.log(`   📁 Selected: ${actualPath}`);
    await fs.mkdir(actualPath, { recursive: true });

    const filename = `perplexity-threads-${Date.now()}.json`;
    const fullPath = path.join(actualPath, filename);

    console.log(`\n📝 Writing file...`);
    await fs.writeFile(fullPath, JSON.stringify(result.data, null, 2));

    await overlay.appendHtml(`
      <div style="margin-top:15px;color:#00ff00;">✅ File saved successfully!</div>
      <div style="margin-top:5px;color:#aaaaaa;">📁 Location: <span style="color:#00bfff;">${fullPath}</span></div>
    `);

    console.log('\n' + '='.repeat(60));
    console.log('✅ EXPORT COMPLETE!');
    console.log('='.repeat(60));
    console.log(`📥 Saved to: ${fullPath}`);
    console.log(`📦 File size: ${(JSON.stringify(result.data).length / 1024).toFixed(2)} KB`);
    console.log('='.repeat(60));
  } else {
    console.log(`\n❌ Export failed: ${result.error}`);
  }

  console.log('\n✅ Done! Closing browser in 5 seconds...');
  await page.waitForTimeout(5000);
}

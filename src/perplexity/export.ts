import type { Page } from 'playwright';
import type { BrowserConsole } from '../browser/console-overlay.js';
import { updateStatusBadge } from '../browser/status-badge.js';
import { fetchThread } from './api.js';
import type { ExportResult, ThreadData, ThreadLink } from '../types.js';

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 3) + '...' : s;
}

/**
 * Iterates through all thread links, fetches each one, and streams progress
 * to both the terminal and the browser overlay console.
 */
export async function exportThreads(
  page: Page,
  threads: ThreadLink[],
  overlay: BrowserConsole
): Promise<ExportResult> {
  const log: string[] = [];
  const detailedThreads: ThreadData[] = [];
  let successCount = 0;
  let errorCount = 0;

  await overlay.log(`📦 Found ${threads.length} unique threads to export`, '#00bfff');
  await overlay.log('━'.repeat(60), '#444444');

  for (let i = 0; i < threads.length; i++) {
    const thread = threads[i];
    if (!thread) continue;

    const progress = `[${i + 1}/${threads.length}]`;
    const percentage = Math.round(((i + 1) / threads.length) * 100);
    const displayTitle = truncate(thread.title, 50);

    console.log(`${progress} ${percentage}% - ${displayTitle}`);
    log.push(`${progress} ${displayTitle}`);
    await overlay.log(`${progress} ${percentage}% - ${displayTitle}`, '#ffffff');

    await updateStatusBadge(page, {
      background: '#f59e0b',
      html: `
        <div style="font-size:16px;margin-bottom:8px;">⬇️ Exporting Threads</div>
        <div style="font-size:24px;font-weight:bold;margin-bottom:5px;">${percentage}%</div>
        <div style="font-size:13px;opacity:0.9;margin-bottom:5px;">${i + 1} / ${threads.length}</div>
        <div style="font-size:11px;opacity:0.8;border-top:1px solid rgba(255,255,255,0.2);padding-top:5px;margin-top:5px;">
          ${truncate(thread.title, 30)}
        </div>
      `,
    });

    try {
      const result = await fetchThread(page, thread);

      if (result) {
        detailedThreads.push(result.data);
        log.push(`  ✅ ${result.stepCount} steps`);

        if (result.stepCount > 0) {
          await overlay.log(`          ✅ ${result.stepCount} steps downloaded`, '#00ff00');
        } else {
          await overlay.log(`          ⚠️  No steps found`, '#ff4444');
          console.warn(`          Warning: Thread "${thread.title}" has no steps.`);
        }
        successCount++;
      } else {
        log.push(`  ⚠️ HTTP error`);
        await overlay.log(`          ⚠️  HTTP error`, '#ffaa00');
        detailedThreads.push(thread as unknown as ThreadData);
        errorCount++;
      }
    } catch (error) {
      const msg = (error as Error).message;
      log.push(`  ❌ Error: ${msg}`);
      await overlay.log(`          ❌ Error: ${msg}`, '#ff4444');
      detailedThreads.push(thread as unknown as ThreadData);
      errorCount++;
    }

    // Small delay between requests to avoid rate limiting
    await page.waitForTimeout(450);
  }

  await overlay.log('━'.repeat(60), '#444444');
  await overlay.log(
    `✅ Download complete: ${successCount} successful, ${errorCount} errors`,
    '#00ff00'
  );

  await updateStatusBadge(page, {
    background: '#10b981',
    html: `
      <div style="font-size:16px;margin-bottom:8px;">✅ Export Complete</div>
      <div style="font-size:13px;opacity:0.9;">✅ ${successCount} successful</div>
      <div style="font-size:13px;opacity:0.9;">❌ ${errorCount} failed</div>
      <div style="font-size:11px;opacity:0.8;margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.2);">
        Check terminal for details
      </div>
    `,
  });

  return {
    success: true,
    log,
    data: detailedThreads,
    count: detailedThreads.length,
    successCount,
    errorCount,
  };
}

/**
 * Perplexity Exporter - Main Entry Point
 *
 * Automated export tool for Perplexity.ai threads with full conversation history
 *
 * Features:
 * - Auto-navigates to Perplexity Library
 * - Auto-scrolls to load all threads
 * - Injects and runs export script
 * - Saves to user-selected location
 */

import { chromium, type BrowserContext, type Page } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import readline from 'readline';

interface ThreadData {
  steps?: Array<{
    step_type: string;
    query_str?: string;
    final_response?: string;
  }>;
  [key: string]: unknown;
}

interface ExportResult {
  success: boolean;
  log: string[];
  data?: ThreadData[];
  count?: number;
  successCount?: number;
  errorCount?: number;
  error?: string;
}

async function main(): Promise<void> {
  console.log('🚀 Perplexity Exporter\n');

  const userDataDir = path.resolve('./browser-data-playwright');

  // Launch persistent context (maintains login)
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
    args: ['--disable-blink-features=AutomationControlled'],
  });

  try {
    await runExport(context);
  } finally {
    await context.close();
  }
}

async function runExport(context: BrowserContext): Promise<void> {
  const page = context.pages()[0] || (await context.newPage());

  console.log('📋 Steps:');
  console.log('   1. Browser opened');
  console.log('   2. Navigating to Perplexity Library...\n');

  // Navigate to Perplexity
  await page.goto('https://www.perplexity.ai', { waitUntil: 'networkidle' });

  // Check if logged in
  const isLoggedIn = (await page.locator('a[href*="/library"]').count()) > 0;

  if (!isLoggedIn) {
    console.log('⚠️  Please log in to Perplexity');
    console.log('   Press ENTER after logging in...\n');
    await waitForEnter();
  }

  // Navigate to library
  console.log('📚 Navigating to Library...');
  await page.goto('https://www.perplexity.ai/library', { waitUntil: 'domcontentloaded' });

  // Wait for thread links to appear
  try {
    await page.waitForSelector('a[href*="/search/"]', { timeout: 10000 });
  } catch {
    console.log('⚠️  No threads found or page not loaded properly');
  }

  await page.waitForTimeout(2000);

  // Add visual indicators
  await addVisualIndicators(page);

  console.log('📜 Scrolling to load all threads...');
  console.log('   💡 This may take a while for large libraries\n');

  // Auto-scroll to load all threads
  await autoScrollThreads(page);

  console.log('\n💉 Injecting and running export script...\n');
  await page.waitForTimeout(1000);

  // Run the export
  const result = await injectAndExportThreads(page);

  // Print summary
  printSummary(result);

  if (result.success && result.data) {
    const saveDir = await promptSaveLocation(page);
    const actualPath = resolveSavePath(saveDir);

    console.log(`   📁 Selected: ${actualPath}`);

    await fs.mkdir(actualPath, { recursive: true });

    const timestamp = Date.now();
    const filename = `perplexity-threads-${timestamp}.json`;
    const fullPath = path.join(actualPath, filename);

    console.log(`\n📝 Writing file...`);
    await fs.writeFile(fullPath, JSON.stringify(result.data, null, 2));

    await updateSaveStatus(page, fullPath);

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

async function addVisualIndicators(page: Page): Promise<void> {
  await page.evaluate(() => {
    /* eslint-disable no-undef */
    const indicator = document.createElement('div');
    indicator.id = 'scroll-indicator';
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #1a73e8;
      color: white;
      padding: 15px 25px;
      border-radius: 8px;
      font-family: system-ui, sans-serif;
      font-size: 14px;
      font-weight: 600;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    indicator.textContent = '🔄 Auto-scrolling to load threads...';
    document.body.appendChild(indicator);

    const scrollContainer = document.querySelector('.scrollable-container');
    if (scrollContainer) {
      (scrollContainer as HTMLElement).style.outline = '3px solid #1a73e8';
      (scrollContainer as HTMLElement).style.outlineOffset = '-3px';
    }
  });
}

async function autoScrollThreads(page: Page): Promise<void> {
  let previousHeight = 0;
  let scrollAttempts = 0;
  let stableCount = 0;
  const maxScrollAttempts = 100;
  const stableThreshold = 3;

  while (scrollAttempts < maxScrollAttempts) {
    const scrollInfo = await page.evaluate(() => {
      /* eslint-disable no-undef */
      const scrollContainer = document.querySelector('.scrollable-container');
      const allThreads = document.querySelectorAll('a[href*="/search/"]');
      const uniqueLinks = new Set<string>();

      allThreads.forEach((el) => {
        const href = (el as HTMLAnchorElement).href;
        if (href && href.includes('/search/')) {
          uniqueLinks.add(href);
        }
      });

      return {
        height: scrollContainer ? scrollContainer.scrollHeight : document.body.scrollHeight,
        scrollTop: scrollContainer ? scrollContainer.scrollTop : window.scrollY,
        threadCount: uniqueLinks.size,
        visibleThreads: allThreads.length,
        containerFound: !!scrollContainer,
      };
    });

    console.log(
      `   📊 Scroll ${scrollAttempts + 1}: Found ${scrollInfo.threadCount} unique threads (${scrollInfo.visibleThreads} elements)`
    );
    console.log(
      `       Height: ${scrollInfo.height}px, ScrollTop: ${scrollInfo.scrollTop}px ${scrollInfo.containerFound ? '(scrollable-container)' : '(fallback)'}`
    );

    await page.evaluate(
      ({ attempt, count }) => {
        const indicator = document.getElementById('scroll-indicator');
        if (indicator) {
          indicator.innerHTML = `
          <div style="font-size: 16px; margin-bottom: 5px;">🔄 Auto-Scrolling</div>
          <div style="font-size: 13px; opacity: 0.9;">Attempt: ${attempt}</div>
          <div style="font-size: 13px; opacity: 0.9;">Threads: ${count}</div>
        `;
        }
      },
      { attempt: scrollAttempts + 1, count: scrollInfo.threadCount }
    );

    if (scrollInfo.height === previousHeight) {
      stableCount++;
      console.log(`   ⏸️  Height stable (${stableCount}/${stableThreshold})`);

      if (stableCount >= stableThreshold) {
        console.log(`   ✅ All threads loaded! Total: ${scrollInfo.threadCount}\n`);
        break;
      }
    } else {
      stableCount = 0;
      console.log(`   📈 New content detected (height increased)`);
    }

    await page.evaluate(() => {
      /* eslint-disable no-undef */
      const scrollContainer = document.querySelector('.scrollable-container');
      if (scrollContainer) {
        (scrollContainer as HTMLElement).style.outline = '3px solid #fbbf24';
        setTimeout(() => {
          (scrollContainer as HTMLElement).style.outline = '3px solid #1a73e8';
        }, 300);

        scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
      } else {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }
    });

    await page.waitForTimeout(2000);

    previousHeight = scrollInfo.height;
    scrollAttempts++;
  }

  if (scrollAttempts >= maxScrollAttempts) {
    console.log('   ⚠️  Reached max scroll attempts, continuing with loaded threads\n');
  }

  await page.evaluate(() => {
    /* eslint-disable no-undef */
    const indicator = document.getElementById('scroll-indicator');
    if (indicator) {
      indicator.style.background = '#10b981';
      indicator.innerHTML = `
        <div style="font-size: 16px; margin-bottom: 5px;">✅ Scrolling Complete</div>
        <div style="font-size: 13px; opacity: 0.9;">Ready to export...</div>
      `;
    }

    const scrollContainer = document.querySelector('.scrollable-container');
    if (scrollContainer) {
      (scrollContainer as HTMLElement).style.outline = 'none';
    }
  });
}

async function injectAndExportThreads(page: Page): Promise<ExportResult> {
  await page.evaluate(() => {
    /* eslint-disable no-undef */
    const indicator = document.getElementById('scroll-indicator');
    if (indicator) {
      indicator.style.background = '#f59e0b';
      indicator.innerHTML = `
        <div style="font-size: 16px; margin-bottom: 5px;">⬇️ Starting Export</div>
        <div style="font-size: 13px; opacity: 0.9;">Preparing...</div>
      `;
    }

    // Helper function to create or get console
    const ensureConsole = () => {
      let consoleContent = document.getElementById('export-console-content');
      if (!consoleContent) {
        const consoleLog = document.createElement('div');
        consoleLog.id = 'export-console';
        consoleLog.style.cssText = `
          position: fixed;
          bottom: 20px;
          left: 20px;
          right: 20px;
          max-width: 1000px;
          height: 500px;
          background: rgba(0, 0, 0, 0.95);
          color: #00ff00;
          border-radius: 8px;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 12px;
          z-index: 9999;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5);
          border: 1px solid rgba(255,255,255,0.1);
          display: flex;
          flex-direction: column;
        `;

        const header = document.createElement('div');
        header.style.cssText = `
          background: linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 100%);
          padding: 8px 12px;
          border-radius: 8px 8px 0 0;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          gap: 8px;
        `;

        const buttons = document.createElement('div');
        buttons.style.cssText = 'display: flex; gap: 6px;';
        buttons.innerHTML = `
          <div style="width: 12px; height: 12px; border-radius: 50%; background: #ff5f56;"></div>
          <div style="width: 12px; height: 12px; border-radius: 50%; background: #ffbd2e;"></div>
          <div style="width: 12px; height: 12px; border-radius: 50%; background: #27c93f;"></div>
        `;

        const title = document.createElement('div');
        title.style.cssText = `
          color: #c0c0c0;
          font-size: 12px;
          font-weight: 600;
          margin-left: 8px;
        `;
        title.textContent = '📦 Perplexity Exporter Console';

        header.appendChild(buttons);
        header.appendChild(title);

        const content = document.createElement('div');
        content.id = 'export-console-content';
        content.style.cssText = `
          flex: 1 1 0%;
          padding: 15px;
          overflow: scroll;
          margin-bottom: 10rem;
          scroll-behavior: smooth;
        `;

        consoleLog.appendChild(header);
        consoleLog.appendChild(content);
        document.body.appendChild(consoleLog);
        
        consoleContent = content;
      }
      return consoleContent;
    };

    const consoleContent = ensureConsole();
    consoleContent.innerHTML = '<div style="color: #00ff00;">🚀 Starting export process...</div>';
  });

  const result = await page.evaluate(async () => {
    /* eslint-disable no-undef */
    const log: string[] = [];

    const addToConsole = (message: string, color = '#00ff00') => {
      const consoleContent = document.getElementById('export-console-content');
      if (consoleContent) {
        const line = document.createElement('div');
        line.style.color = color;
        line.textContent = message;
        consoleContent.appendChild(line);
        consoleContent.scrollTop = consoleContent.scrollHeight;
      }
    };

    console.log('🔍 Scanning page for threads...');
    addToConsole('🔍 Scanning page for threads...');
    const threadElements = document.querySelectorAll('a[href*="/search/"]');
    const threads: Array<{ id: string; title: string; url: string; slug: string }> = [];

    threadElements.forEach((el) => {
      const href = (el as HTMLAnchorElement).href;
      const title = (el as HTMLElement).textContent?.trim() || el.getAttribute('aria-label') || '';

      if (href && title && href.includes('/search/')) {
        const match = href.match(/\/search\/([^/?]+)/);
        if (match && match[1]) {
          threads.push({
            id: match[1],
            title: title,
            url: href,
            slug: match[1],
          });
        }
      }
    });

    const uniqueThreads = [...new Map(threads.map((t) => [t.id, t])).values()];

    log.push(`Found ${uniqueThreads.length} unique threads`);
    console.log(`📦 Found ${uniqueThreads.length} unique threads to export`);
    addToConsole(`📦 Found ${uniqueThreads.length} unique threads to export`, '#00bfff');

    if (uniqueThreads.length === 0) {
      addToConsole('❌ No threads found!', '#ff4444');
      return { success: false, log, error: 'No threads found' };
    }

    const detailedThreads: unknown[] = [];
    let successCount = 0;
    let errorCount = 0;

    console.log('\n⬇️  Starting download...\n');
    addToConsole('\n⬇️  Starting download...', '#ffaa00');
    addToConsole('━'.repeat(60), '#444444');

    const updateIndicator = (
      current: number,
      total: number,
      title: string,
      status = 'downloading'
    ) => {
      const indicator = document.getElementById('scroll-indicator');
      if (indicator) {
        const percentage = Math.round((current / total) * 100);
        const displayTitle = title.length > 30 ? title.substring(0, 27) + '...' : title;

        let statusEmoji = '⬇️';
        let bgColor = '#f59e0b';

        if (status === 'success') {
          statusEmoji = '✅';
          bgColor = '#10b981';
        } else if (status === 'error') {
          statusEmoji = '❌';
          bgColor = '#ef4444';
        }

        indicator.style.background = bgColor;
        indicator.innerHTML = `
          <div style="font-size: 16px; margin-bottom: 8px;">${statusEmoji} Exporting Threads</div>
          <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">${percentage}%</div>
          <div style="font-size: 13px; opacity: 0.9; margin-bottom: 5px;">${current} / ${total}</div>
          <div style="font-size: 11px; opacity: 0.8; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 5px; margin-top: 5px;">
            ${displayTitle}
          </div>
        `;

        if (status !== 'downloading') {
          setTimeout(() => {
            indicator.style.background = '#f59e0b';
          }, 200);
        }
      }
    };

    for (let i = 0; i < uniqueThreads.length; i++) {
      const thread = uniqueThreads[i];
      if (!thread) continue;

      const progress = `[${i + 1}/${uniqueThreads.length}]`;
      const percentage = Math.round(((i + 1) / uniqueThreads.length) * 100);

      const displayTitle =
        thread.title.length > 50 ? thread.title.substring(0, 47) + '...' : thread.title;

      console.log(`${progress} ${percentage}% - ${displayTitle}`);
      log.push(`${progress} ${displayTitle}`);
      addToConsole(`${progress} ${percentage}% - ${displayTitle}`, '#ffffff');

      updateIndicator(i + 1, uniqueThreads.length, thread.title, 'downloading');
      await new Promise((resolve) => setTimeout(resolve, 100));

      try {
        const response = await fetch(`https://www.perplexity.ai/rest/thread/${thread.slug}`);
        if (response.ok) {
          const data = await response.json();

          // Check if the response is a paginated wrapper
          let threadData = data;
          if (data.status && data.entries && Array.isArray(data.entries)) {
            // This is a paginated response where entries contains the conversation steps
            threadData = {
              ...thread, // Keep original thread metadata (title, url, slug)
              steps: data.entries, // Rename entries to steps for consistency
              has_next_page: data.has_next_page,
              next_cursor: data.next_cursor,
            };
          }

          detailedThreads.push(threadData);

          // Check for steps (could be direct or from entries)
          const stepCount =
            (threadData as { steps?: unknown[] }).steps?.length ||
            (data as { steps?: unknown[] }).steps?.length ||
            0;

          console.log(`          ✅ ${stepCount} steps downloaded`);
          log.push(`  ✅ ${stepCount} steps`);

          if (stepCount > 0) {
            addToConsole(`          ✅ ${stepCount} steps downloaded`, '#00ff00');
          } else {
            const keys = Object.keys(data as object).join(', ');
            addToConsole(`          ⚠️  No steps found! Keys: ${keys}`, '#ff4444');
            console.warn(`          Warning: Thread has no steps. Response keys: ${keys}`);
          }

          successCount++;
          updateIndicator(i + 1, uniqueThreads.length, thread.title, 'success');
          await new Promise((resolve) => setTimeout(resolve, 150));
        } else {
          console.log(`          ⚠️  Failed (HTTP ${response.status})`);
          log.push(`  ⚠️ Failed (${response.status})`);
          addToConsole(`          ⚠️  Failed (HTTP ${response.status})`, '#ffaa00');
          detailedThreads.push(thread);
          errorCount++;
          updateIndicator(i + 1, uniqueThreads.length, thread.title, 'error');
          await new Promise((resolve) => setTimeout(resolve, 150));
        }

        await new Promise((resolve) => setTimeout(resolve, 350));
      } catch (error) {
        console.log(`          ❌ Error: ${(error as Error).message}`);
        log.push(`  ❌ Error: ${(error as Error).message}`);
        addToConsole(`          ❌ Error: ${(error as Error).message}`, '#ff4444');
        detailedThreads.push(thread);
        errorCount++;
        updateIndicator(i + 1, uniqueThreads.length, thread.title, 'error');
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    }

    console.log(`\n✅ Download complete: ${successCount} successful, ${errorCount} errors`);
    addToConsole('━'.repeat(60), '#444444');
    addToConsole(
      `✅ Download complete: ${successCount} successful, ${errorCount} errors`,
      '#00ff00'
    );

    const indicator = document.getElementById('scroll-indicator');
    if (indicator) {
      indicator.style.background = '#10b981';
      indicator.innerHTML = `
        <div style="font-size: 16px; margin-bottom: 8px;">✅ Export Complete</div>
        <div style="font-size: 13px; opacity: 0.9;">✅ ${successCount} successful</div>
        <div style="font-size: 13px; opacity: 0.9;">❌ ${errorCount} failed</div>
        <div style="font-size: 11px; opacity: 0.8; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2);">
          Check terminal for details
        </div>
      `;
    }

    return {
      success: true,
      log,
      data: detailedThreads,
      count: detailedThreads.length,
      successCount,
      errorCount,
    };
  });

  return result as ExportResult;
}

function printSummary(result: ExportResult): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 Export Summary:');
  console.log('='.repeat(60));
  console.log(`   Total threads: ${result.count || 0}`);
  console.log(`   ✅ Successfully exported: ${result.successCount || 0}`);
  console.log(`   ❌ Failed: ${result.errorCount || 0}`);

  if (result.data) {
    const withSteps = result.data.filter((t) => t.steps && t.steps.length > 0).length;
    console.log(`   📝 With steps: ${withSteps}`);
    if (withSteps < (result.successCount || 0)) {
      console.log(
        `   ⚠️  Missing steps: ${(result.successCount || 0) - withSteps} threads have no steps!`
      );
    }
  }
  console.log('='.repeat(60));
}

async function promptSaveLocation(page: Page): Promise<string> {
  console.log('\n💾 Asking for save location...');

  const saveDir = await page.evaluate(() => {
    /* eslint-disable no-undef */
    return new Promise<string>((resolve) => {
      // Helper function to create or get console (same as injectAndExportThreads)
      const ensureConsole = () => {
        let consoleContent = document.getElementById('export-console-content');
        if (!consoleContent) {
          const consoleLog = document.createElement('div');
          consoleLog.id = 'export-console';
          consoleLog.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            right: 20px;
            max-width: 1000px;
            height: 500px;
            background: rgba(0, 0, 0, 0.95);
            color: #00ff00;
            border-radius: 8px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 12px;
            z-index: 9999;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            border: 1px solid rgba(255,255,255,0.1);
            display: flex;
            flex-direction: column;
          `;

          const header = document.createElement('div');
          header.style.cssText = `
            background: linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 100%);
            padding: 8px 12px;
            border-radius: 8px 8px 0 0;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            display: flex;
            align-items: center;
            gap: 8px;
          `;

          const buttons = document.createElement('div');
          buttons.style.cssText = 'display: flex; gap: 6px;';
          buttons.innerHTML = `
            <div style="width: 12px; height: 12px; border-radius: 50%; background: #ff5f56;"></div>
            <div style="width: 12px; height: 12px; border-radius: 50%; background: #ffbd2e;"></div>
            <div style="width: 12px; height: 12px; border-radius: 50%; background: #27c93f;"></div>
          `;

          const title = document.createElement('div');
          title.style.cssText = `
            color: #c0c0c0;
            font-size: 12px;
            font-weight: 600;
            margin-left: 8px;
          `;
          title.textContent = '📦 Perplexity Exporter Console';

          header.appendChild(buttons);
          header.appendChild(title);

          const content = document.createElement('div');
          content.id = 'export-console-content';
          content.style.cssText = `
            flex: 1 1 0%;
            padding: 15px;
            overflow: scroll;
            margin-bottom: 10rem;
            scroll-behavior: smooth;
          `;

          consoleLog.appendChild(header);
          consoleLog.appendChild(content);
          document.body.appendChild(consoleLog);
          
          consoleContent = content;
        }
        return consoleContent;
      };

      const consoleContent = ensureConsole();

      consoleContent.innerHTML += `
        <div style="margin-top: 20px; color: #ffaa00; font-weight: bold;">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
        <div style="margin-top: 10px; color: #00bfff; font-weight: bold;">💾 Choose Save Location</div>
        <div style="margin-top: 8px; color: #aaaaaa;">Where would you like to save your Perplexity threads?</div>
        <div style="margin-top: 12px; color: #aaaaaa;">
          <div style="margin-bottom: 5px;">  [1] 📁 Current Folder (Default)</div>
          <div style="margin-bottom: 5px;">  [2] 🏠 Home Folder (~)</div>
          <div style="margin-bottom: 5px;">  [3] 🖥️  Desktop (~/Desktop)</div>
          <div style="margin-bottom: 5px;">  [4] ✏️  Custom Path</div>
        </div>
        <div style="margin-top: 12px; display: flex; align-items: center; gap: 10px;">
          <span style="color: #00ff00;">$</span>
          <span style="color: #aaaaaa;">Enter choice [1-4]:</span>
          <input 
            type="text" 
            id="save-choice-input"
            autocomplete="off"
            style="
              background: transparent;
              border: none;
              border-bottom: 2px solid #00ff00;
              color: #00ff00;
              font-family: inherit;
              font-size: inherit;
              padding: 2px 8px;
              outline: none;
              width: 60px;
              caret-color: #00ff00;
            "
          >
        </div>
        <div id="custom-path-container" style="display: none; margin-top: 12px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="color: #00ff00;">$</span>
            <span style="color: #aaaaaa;">Enter path:</span>
            <input 
              type="text" 
              id="custom-path-input"
              autocomplete="off"
              placeholder="/path/to/folder"
              style="
                background: transparent;
                border: none;
                border-bottom: 2px solid #00ff00;
                color: #00ff00;
                font-family: inherit;
                font-size: inherit;
                padding: 2px 8px;
                outline: none;
                flex: 1;
                caret-color: #00ff00;
              "
            >
          </div>
        </div>
      `;

      // Force scroll to bottom after DOM update
      setTimeout(() => {
        consoleContent.scrollTop = consoleContent.scrollHeight;
      }, 10);

      const choiceInput = document.getElementById('save-choice-input') as HTMLInputElement;
      if (choiceInput) {
        // Scroll into view and focus
        choiceInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => choiceInput.focus(), 100);
      }

      choiceInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const choice = (e.target as HTMLInputElement).value.trim();

          const choiceDisplay = document.createElement('div');
          choiceDisplay.style.color = '#00ff00';
          choiceDisplay.style.marginTop = '5px';

          switch (choice) {
            case '1':
              choiceDisplay.textContent = '> Selected: Current Folder';
              consoleContent.appendChild(choiceDisplay);
              consoleContent.scrollTop = consoleContent.scrollHeight;
              resolve('current');
              break;
            case '2':
              choiceDisplay.textContent = '> Selected: Home Folder';
              consoleContent.appendChild(choiceDisplay);
              consoleContent.scrollTop = consoleContent.scrollHeight;
              resolve('home');
              break;
            case '3':
              choiceDisplay.textContent = '> Selected: Desktop';
              consoleContent.appendChild(choiceDisplay);
              consoleContent.scrollTop = consoleContent.scrollHeight;
              resolve('desktop');
              break;
            case '4': {
              choiceDisplay.textContent = '> Selected: Custom Path';
              consoleContent.appendChild(choiceDisplay);
              consoleContent.scrollTop = consoleContent.scrollHeight;

              const customContainer = document.getElementById('custom-path-container');
              if (customContainer) {
                customContainer.style.display = 'block';
                const customInput = document.getElementById(
                  'custom-path-input'
                ) as HTMLInputElement;
                customInput.focus();

                customInput.addEventListener('keypress', (e2) => {
                  if (e2.key === 'Enter') {
                    const customPath = (e2.target as HTMLInputElement).value.trim();
                    if (customPath) {
                      const pathDisplay = document.createElement('div');
                      pathDisplay.style.color = '#00ff00';
                      pathDisplay.style.marginTop = '5px';
                      pathDisplay.textContent = `> Path: ${customPath}`;
                      consoleContent.appendChild(pathDisplay);
                      consoleContent.scrollTop = consoleContent.scrollHeight;
                      resolve(customPath);
                    }
                  }
                });
              }
              break;
            }
            default:
              choiceDisplay.textContent = '> Invalid choice. Using Current Folder (default)';
              choiceDisplay.style.color = '#ffaa00';
              consoleContent.appendChild(choiceDisplay);
              consoleContent.scrollTop = consoleContent.scrollHeight;
              resolve('current');
          }
        }
      });
    });
  });

  return saveDir;
}

function resolveSavePath(saveDir: string): string {
  switch (saveDir) {
    case 'current':
      return process.cwd();
    case 'home':
      return os.homedir();
    case 'desktop':
      return path.join(os.homedir(), 'Desktop');
    default:
      return saveDir;
  }
}

async function updateSaveStatus(page: Page, fullPath: string): Promise<void> {
  await page.evaluate(
    ({ path }) => {
      /* eslint-disable no-undef */
      const consoleContent = document.getElementById('export-console-content');
      if (consoleContent) {
        consoleContent.innerHTML += `
        <div style="margin-top: 15px; color: #00ff00;">✅ File saved successfully!</div>
        <div style="margin-top: 5px; color: #aaaaaa;">📁 Location: <span style="color: #00bfff;">${path}</span></div>
      `;
        consoleContent.scrollTop = consoleContent.scrollHeight;
      }
    },
    { path: fullPath }
  );
}

function waitForEnter(): Promise<void> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question('Press ENTER when ready... ', () => {
      rl.close();
      resolve();
    });
  });
}

// Run the main function
main().catch(console.error);

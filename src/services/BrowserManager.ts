import puppeteer, { type Browser, type Page } from 'puppeteer-core';
import readline from 'readline';
import type { BrowserConfig } from '../types/index.js';
import { CookieManager } from './CookieManager.js';

/**
 * Browser automation manager - connects to existing Chrome via remote debugging
 *
 * Requires Chrome started with: --remote-debugging-port=9222
 */
export class BrowserManager {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private readonly cookieManager: CookieManager;
  private readonly debugPort: number;

  constructor(
    private readonly config: BrowserConfig,
    cookieManager?: CookieManager,
    debugPort: number = 9222
  ) {
    this.cookieManager = cookieManager || new CookieManager();
    this.debugPort = debugPort;
  }

  /**
   * Connect to existing Chrome instance via remote debugging
   */
  async initialize(): Promise<{ browser: Browser; page: Page }> {
    if (this.browser && this.page) {
      return { browser: this.browser, page: this.page };
    }

    try {
      const browserURL = `http://127.0.0.1:${this.debugPort}`;
      console.log(`🔌 Connecting to Chrome at ${browserURL}...`);

      this.browser = await puppeteer.connect({
        browserURL,
        defaultViewport: null, // Use browser's viewport
      });

      // Get active page or create new one
      const pages = await this.browser.pages();
      if (pages.length > 0) {
        this.page = pages[0];
        console.log('✅ Connected to existing tab');
      } else {
        this.page = await this.browser.newPage();
        console.log('✅ Created new tab');
      }

      return { browser: this.browser, page: this.page };
    } catch (error) {
      const errorMessage =
        '❌ Failed to connect to Chrome.\n\n' +
        '   Please start Chrome with remote debugging enabled:\n\n' +
        '   /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222\n\n' +
        `   Error: ${error instanceof Error ? error.message : String(error)}`;

      throw new Error(errorMessage);
    }
  }

  /**
   * Inject and execute export script in the browser
   */
  async injectExportScript(): Promise<{
    success: boolean;
    log: string[];
    data?: unknown[];
    count?: number;
    error?: string;
  }> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    console.log('💉 Injecting export script into page...');

    const result = await this.page.evaluate(async () => {
      const log: string[] = [];

      // Get all thread links from the page
      const threadElements = document.querySelectorAll('a[href*="/search/"]');
      const threads: Array<{ id: string; title: string; url: string; slug: string }> = [];

      threadElements.forEach((el) => {
        const href = (el as HTMLAnchorElement).href;
        const title =
          (el as HTMLElement).textContent?.trim() || el.getAttribute('aria-label') || '';

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

      // Remove duplicates
      const uniqueThreads = [...new Map(threads.map((t) => [t.id, t])).values()];

      log.push(`Found ${uniqueThreads.length} threads`);

      if (uniqueThreads.length === 0) {
        return { success: false, log, error: 'No threads found' };
      }

      // Fetch details for each thread
      const detailedThreads: unknown[] = [];

      for (let i = 0; i < uniqueThreads.length; i++) {
        const thread = uniqueThreads[i];
        if (!thread) continue;

        log.push(`[${i + 1}/${uniqueThreads.length}] ${thread.title}`);

        try {
          const response = await fetch(`https://www.perplexity.ai/rest/thread/${thread.slug}`);
          if (response.ok) {
            const data = await response.json();
            detailedThreads.push(data);
            log.push(`  ✅ ${(data as { messages?: unknown[] }).messages?.length || 0} messages`);
          } else {
            log.push(`  ⚠️ Failed (${response.status})`);
            detailedThreads.push(thread);
          }

          // Small delay between requests
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          log.push(`  ❌ Error: ${(error as Error).message}`);
          detailedThreads.push(thread);
        }
      }

      return {
        success: true,
        log,
        data: detailedThreads,
        count: detailedThreads.length,
      };
    });

    return result;
  }

  /**
   * Wait for user to navigate and load threads
   */
  async waitForUserReady(): Promise<void> {
    console.log('\n📋 Instructions:');
    console.log('   1. Navigate to your Perplexity Library/Threads page');
    console.log('   2. Scroll to load all threads');
    console.log('   3. Press ENTER here when ready\n');

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

  /**
   * Get the current page
   */
  getPage(): Page | null {
    return this.page;
  }

  /**
   * Get the browser instance
   */
  getBrowser(): Browser | null {
    return this.browser;
  }

  /**
   * Close browser connection (doesn't close the actual browser)
   */
  async close(): Promise<void> {
    if (this.browser) {
      this.browser.disconnect();
      this.browser = null;
      this.page = null;
      console.log('✅ Disconnected from Chrome');
    }
  }
}

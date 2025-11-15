import fs from 'fs/promises';
import path from 'path';
import puppeteer, { type Browser, type Page } from 'puppeteer';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { BrowserConfig } from '../types/index.js';
import { CloudflareError, TimeoutError } from '../utils/errors.js';
import { CookieManager } from './CookieManager.js';

// Add stealth plugin
puppeteerExtra.use(StealthPlugin());

/**
 * Browser automation manager with stealth capabilities
 *
 * Handles browser lifecycle, stealth configuration, and Cloudflare bypass
 */
export class BrowserManager {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private readonly cookieManager: CookieManager;

  constructor(
    private readonly config: BrowserConfig,
    cookieManager?: CookieManager
  ) {
    this.cookieManager = cookieManager || new CookieManager();
  }

  /**
   * Initialize browser with stealth configuration
   */
  async initialize(): Promise<{ browser: Browser; page: Page }> {
    if (this.browser && this.page) {
      return { browser: this.browser, page: this.page };
    }

    const launchOptions = this.buildLaunchOptions();

    // Use puppeteer-extra with stealth plugin for Chromium
    if (this.config.browserType === 'chromium') {
      this.browser = await puppeteerExtra.launch(launchOptions);
    } else {
      // Firefox would require different setup - for now use chromium
      this.browser = await puppeteerExtra.launch(launchOptions);
    }

    const pages = await this.browser.pages();
    this.page = pages[0] || (await this.browser.newPage());

    await this.configurePageBehavior();
    await this.loadAndInjectCookies();

    return { browser: this.browser, page: this.page };
  }

  /**
   * Build Puppeteer launch options from config
   */
  private buildLaunchOptions(): Parameters<typeof puppeteer.launch>[0] {
    const args: string[] = [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      `--window-size=${this.config.viewport.width},${this.config.viewport.height}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
    ];

    const options: Parameters<typeof puppeteer.launch>[0] = {
      headless: this.config.headless,
      args,
      defaultViewport: {
        width: this.config.viewport.width,
        height: this.config.viewport.height,
      },
    };

    if (this.config.executablePath) {
      options.executablePath = this.config.executablePath;
    }

    if (this.config.profilePath) {
      options.userDataDir = this.config.profilePath;
    }

    return options;
  }

  /**
   * Configure page behavior and inject stealth scripts
   */
  private async configurePageBehavior(): Promise<void> {
    if (!this.page) return;

    // Set viewport
    await this.page.setViewport({
      width: this.config.viewport.width,
      height: this.config.viewport.height,
    });

    // Set user agent
    if (this.config.userAgent) {
      await this.page.setUserAgent(this.config.userAgent);
    }

    // Set extra HTTP headers
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': this.config.locale,
    });

    // Inject stealth scripts
    await this.injectStealthScripts();
  }

  /**
   * Inject stealth scripts to avoid detection
   */
  private async injectStealthScripts(): Promise<void> {
    if (!this.page) return;

    await this.page.evaluateOnNewDocument(() => {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      // Override webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });

      // Mock plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'PDF', length: 1 },
          {
            name: 'Chrome PDF Viewer',
            filename: 'internal-pdf-viewer',
            description: 'PDF',
            length: 1,
          },
        ],
      });

      // Languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });

      // Hardware
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 8,
      });

      // Add chrome runtime
      if (!(window as any).chrome) {
        (window as any).chrome = {};
      }
      (window as any).chrome.runtime = {};

      // Mock permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: any) =>
        parameters.name === 'notifications'
          ? Promise.resolve({ state: (Notification as any).permission } as PermissionStatus)
          : originalQuery(parameters);
      /* eslint-enable @typescript-eslint/no-explicit-any */
    });
  }

  /**
   * Load and inject cookies if available
   */
  private async loadAndInjectCookies(): Promise<void> {
    if (!this.page) return;

    try {
      const cookies = await this.cookieManager.loadCookies();
      if (cookies && cookies.length > 0) {
        console.log(`🍪 Loading ${cookies.length} cookies`);
        await this.cookieManager.injectIntoPage(this.page, cookies);
      }
    } catch (error) {
      console.warn('⚠️  Could not load cookies:', error);
    }
  }

  /**
   * Handle Cloudflare challenge if present
   */
  async handleCloudflareChallenge(timeout: number = 30000): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    console.log('🔍 Checking for Cloudflare challenge...');

    try {
      await new Promise((resolve) => globalThis.setTimeout(resolve, 2000));

      const isChallenged = await this.page.evaluate(() => {
        return (
          document.title.includes('Just a moment') ||
          document.body.textContent?.includes('Checking your browser') ||
          document.querySelector('#challenge-running') !== null ||
          document.querySelector('.cf-browser-verification') !== null
        );
      });

      if (isChallenged) {
        console.log('⏳ Cloudflare challenge detected - waiting for completion...');

        await this.page.waitForFunction(
          () => {
            return (
              !document.title.includes('Just a moment') &&
              !document.body.textContent?.includes('Checking your browser') &&
              document.querySelector('#challenge-running') === null
            );
          },
          { timeout }
        );

        await new Promise((resolve) => globalThis.setTimeout(resolve, 3000));
        console.log('✅ Cloudflare challenge passed!');
      } else {
        console.log('✅ No Cloudflare challenge detected');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new TimeoutError('Cloudflare challenge timeout', error);
      }
      throw new CloudflareError('Failed to handle Cloudflare challenge', error);
    }
  }

  /**
   * Navigate to URL with automatic Cloudflare handling
   */
  async goto(url: string, options?: { waitUntil?: 'load' | 'networkidle2' }): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    await this.page.goto(url, {
      waitUntil: options?.waitUntil || 'networkidle2',
      timeout: this.config.timeoutMs,
    });

    // Automatically check for Cloudflare
    if (this.config.stealth) {
      await this.handleCloudflareChallenge(this.config.timeoutMs);
    }
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
   * Close browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  /**
   * Create persistent browser profile directory
   */
  static async ensureProfileDirectory(profilePath: string): Promise<void> {
    const resolved = path.resolve(profilePath);
    await fs.mkdir(resolved, { recursive: true });
  }
}

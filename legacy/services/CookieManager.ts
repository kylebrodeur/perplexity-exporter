import fs from 'fs/promises';
import path from 'path';
import type { Page } from 'puppeteer';
import type { CookieJar } from '../types/index.js';
import { CookieJarSchema } from '../types/index.js';
import { ValidationError } from '../utils/errors.js';

/**
 * Cookie management for Perplexity authentication
 *
 * Handles loading, saving, and injecting cookies for browser sessions
 */
export class CookieManager {
  private readonly cookiePath: string;

  constructor(cookieFilePath: string = './cookies.json') {
    this.cookiePath = path.resolve(cookieFilePath);
  }

  /**
   * Load cookies from file
   */
  async loadCookies(): Promise<CookieJar | null> {
    try {
      const exists = await fs
        .access(this.cookiePath)
        .then(() => true)
        .catch(() => false);

      if (!exists) {
        return null;
      }

      const content = await fs.readFile(this.cookiePath, 'utf-8');
      const json = JSON.parse(content);

      // Validate with Zod schema
      const result = CookieJarSchema.safeParse(json);
      if (!result.success) {
        throw new ValidationError('Invalid cookie format', result.error);
      }

      return result.data;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      console.warn('⚠️  Could not load cookies:', error);
      return null;
    }
  }

  /**
   * Save cookies to file
   */
  async saveCookies(cookies: CookieJar): Promise<void> {
    // Validate before saving
    const result = CookieJarSchema.safeParse(cookies);
    if (!result.success) {
      throw new ValidationError('Invalid cookie data', result.error);
    }

    await fs.writeFile(this.cookiePath, JSON.stringify(result.data, null, 2), 'utf-8');
  }

  /**
   * Extract cookies from a Puppeteer page
   */
  async extractFromPage(page: Page, domain: string = 'perplexity.ai'): Promise<CookieJar> {
    const allCookies = await page.cookies();

    // Filter to specific domain and convert to our schema
    const cookies: CookieJar = allCookies
      .filter((cookie) => cookie.domain.includes(domain))
      .map((cookie) => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        expires: cookie.expires ? Math.floor(cookie.expires) : undefined,
        secure: cookie.secure ?? true,
        httpOnly: cookie.httpOnly ?? false,
        session: cookie.expires === -1 || cookie.expires === undefined,
        sameSite: cookie.sameSite as 'Strict' | 'Lax' | 'None' | undefined,
        source: 'browser',
        lastUpdated: new Date().toISOString(),
      }));

    return cookies;
  }

  /**
   * Inject cookies into a Puppeteer page
   */
  async injectIntoPage(page: Page, cookies: CookieJar): Promise<void> {
    if (cookies.length === 0) {
      return;
    }

    // Convert to Puppeteer cookie format
    const puppeteerCookies = cookies.map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path || '/',
      expires: cookie.expires,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite as 'Strict' | 'Lax' | 'None' | undefined,
    }));

    await page.setCookie(...puppeteerCookies);
  }

  /**
   * Check if cookies file exists
   */
  async cookiesExist(): Promise<boolean> {
    return fs
      .access(this.cookiePath)
      .then(() => true)
      .catch(() => false);
  }

  /**
   * Get cookie file path
   */
  getCookiePath(): string {
    return this.cookiePath;
  }
}

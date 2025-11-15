import type { Page } from 'puppeteer';
import type {
  PerplexityThread,
  Collection,
  ApiResponse,
  ExportConfig,
  ThreadListResponse,
  CollectionListResponse,
} from '../types/index.js';
import {
  NetworkError,
  ValidationError,
  AuthenticationError,
  RateLimitError,
  CloudflareError,
  TimeoutError,
} from '../utils/errors.js';
import { retryWithBackoff, RateLimiter } from '../utils/retry.js';
import { PERPLEXITY_ENDPOINTS, buildApiUrl } from './endpoints.js';

/**
 * Perplexity API Client
 *
 * Handles all API interactions with Perplexity using browser automation.
 * Includes retry logic, rate limiting, and response validation.
 */
export class PerplexityApiClient {
  private readonly rateLimiter: RateLimiter;
  private page: Page | null = null;

  constructor(private readonly config: ExportConfig) {
    // Rate limit: allow 2 requests per second by default
    this.rateLimiter = new RateLimiter(2, 500);
  }

  /**
   * Set the Puppeteer page instance for API calls
   */
  setPage(page: Page): void {
    this.page = page;
  }

  /**
   * List all threads with pagination support
   */
  async listThreads(limit: number = 1000, offset: number = 0): Promise<PerplexityThread[]> {
    const url = buildApiUrl(PERPLEXITY_ENDPOINTS.LIST_ALL_THREADS, { limit, offset });

    const response = await this.fetchWithRetry<ThreadListResponse>(url);

    if (response.status === 'error') {
      throw new NetworkError(`Failed to list threads: ${response.error.message}`);
    }

    return response.data.threads;
  }

  /**
   * Get detailed thread information by slug
   */
  async getThreadDetail(slug: string): Promise<PerplexityThread> {
    const url = buildApiUrl(PERPLEXITY_ENDPOINTS.GET_THREAD_DETAIL(slug));

    const response = await this.fetchWithRetry<ApiResponse<PerplexityThread>>(url);

    if (response.status === 'error') {
      throw new NetworkError(`Failed to get thread ${slug}: ${response.error.message}`);
    }

    return response.data;
  }

  /**
   * List all user collections
   */
  async listCollections(limit: number = 1000, offset: number = 0): Promise<Collection[]> {
    const url = buildApiUrl(PERPLEXITY_ENDPOINTS.LIST_USER_COLLECTIONS, { limit, offset });

    const response = await this.fetchWithRetry<CollectionListResponse>(url);

    if (response.status === 'error') {
      throw new NetworkError(`Failed to list collections: ${response.error.message}`);
    }

    return response.data.collections;
  }

  /**
   * Get detailed collection information by UUID
   */
  async getCollectionDetail(uuid: string): Promise<Collection> {
    const url = buildApiUrl(PERPLEXITY_ENDPOINTS.GET_COLLECTION_DETAIL(uuid));

    const response = await this.fetchWithRetry<ApiResponse<Collection>>(url);

    if (response.status === 'error') {
      throw new NetworkError(`Failed to get collection ${uuid}: ${response.error.message}`);
    }

    return response.data;
  }

  /**
   * Internal fetch with retry, rate limiting, and validation
   */
  private async fetchWithRetry<T>(url: string): Promise<T> {
    if (!this.page) {
      throw new Error('Page not initialized. Call setPage() first.');
    }

    return retryWithBackoff(
      async () => {
        await this.rateLimiter.acquire();
        return await this.fetchAndValidate<T>(url);
      },
      this.config.retry,
      (error) => {
        if (
          error instanceof NetworkError ||
          error instanceof RateLimitError ||
          error instanceof TimeoutError
        ) {
          return error.retriable;
        }
        return false;
      }
    );
  }

  /**
   * Fetch URL via browser and validate response
   */
  private async fetchAndValidate<T>(url: string): Promise<T> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    try {
      const response = await this.page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: this.config.waitForNetworkIdleMs + 5000,
      });

      if (!response) {
        throw new NetworkError('No response received from server');
      }

      const statusCode = response.status();

      // Handle various HTTP status codes
      if (statusCode === 401 || statusCode === 403) {
        throw new AuthenticationError(`Authentication failed (${statusCode})`);
      }

      if (statusCode === 429) {
        const retryAfter = response.headers()['retry-after'];
        const retryAfterMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined;
        throw new RateLimitError('Rate limit exceeded', retryAfterMs);
      }

      if (statusCode >= 500) {
        throw new NetworkError(`Server error (${statusCode})`, statusCode);
      }

      if (statusCode !== 200) {
        throw new NetworkError(`Unexpected status code: ${statusCode}`, statusCode);
      }

      // Extract JSON from page content
      const content = await this.page.content();
      const json = this.extractJson(content);

      if (!json) {
        throw new ValidationError('Failed to parse JSON response');
      }

      // Check for Cloudflare challenge
      if (this.isCloudflareChallenge(content)) {
        throw new CloudflareError('Cloudflare challenge detected');
      }

      return json as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new TimeoutError('Request timed out', error);
      }
      throw error;
    }
  }

  /**
   * Extract JSON from HTML page content
   */
  private extractJson(content: string): unknown {
    try {
      // Try to extract from <pre> tag (common for JSON API responses in browser)
      const preMatch = content.match(/<pre[^>]*>([\s\S]*?)<\/pre>/);
      if (preMatch?.[1]) {
        return JSON.parse(preMatch[1]);
      }

      // Try to parse entire content as JSON
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Detect Cloudflare challenge in page content
   */
  private isCloudflareChallenge(content: string): boolean {
    return (
      content.includes('Verify you are human') ||
      content.includes('cloudflare') ||
      content.includes('cf-browser-verification')
    );
  }
}

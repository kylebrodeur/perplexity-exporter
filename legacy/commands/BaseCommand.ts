import type { BrowserConfig, ExportConfig } from '../types/index.js';
import { BrowserManager } from '../services/BrowserManager.js';
import { CookieManager } from '../services/CookieManager.js';
import { PerplexityApiClient } from '../services/PerplexityApiClient.js';

/**
 * Base command class for browser-based operations
 */
export abstract class BaseCommand {
  protected browserManager: BrowserManager | null = null;
  protected apiClient: PerplexityApiClient | null = null;
  protected cookieManager: CookieManager;

  constructor(
    protected readonly browserConfig: BrowserConfig,
    protected readonly exportConfig: ExportConfig
  ) {
    this.cookieManager = new CookieManager();
  }

  /**
   * Initialize browser and API client
   */
  protected async initializeBrowser(): Promise<void> {
    this.browserManager = new BrowserManager(this.browserConfig, this.cookieManager);
    const { page } = await this.browserManager.initialize();

    this.apiClient = new PerplexityApiClient(this.exportConfig);
    this.apiClient.setPage(page);
  }

  /**
   * Clean up resources
   */
  protected async cleanup(): Promise<void> {
    if (this.browserManager) {
      await this.browserManager.close();
    }
  }

  /**
   * Execute the command (to be implemented by subclasses)
   */
  abstract execute(): Promise<void>;

  /**
   * Run the command with proper error handling and cleanup
   */
  async run(): Promise<void> {
    try {
      await this.execute();
    } catch (error) {
      console.error('❌ Command failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

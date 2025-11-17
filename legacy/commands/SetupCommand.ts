import ora from 'ora';
import { BaseCommand } from './BaseCommand.js';
import type { CookieData } from '../types/index.js';

/**
 * Setup command - one-time browser setup to capture authentication cookies
 */
export class SetupCommand extends BaseCommand {
  async execute(): Promise<void> {
    const spinner = ora('Starting browser setup...').start();

    try {
      await this.initializeBrowser();
      spinner.succeed('Browser initialized');

      if (!this.browserManager) {
        throw new Error('Browser not initialized');
      }

      // Navigate to Perplexity
      spinner.start('Opening Perplexity login page...');
      await this.browserManager.goto('https://www.perplexity.ai');
      spinner.succeed('Opened Perplexity');

      // Wait for user to log in
      console.log('\n🔐 Please complete the following steps in the browser:');
      console.log('   1. Log in to Perplexity (Google signin works)');
      console.log('   2. Complete any Cloudflare "Verify you are human" challenges');
      console.log('      (These may appear AFTER signin - complete them if shown)');
      console.log('   3. Verify you can see your threads/collections');
      console.log('   4. Press ENTER here when ready to continue\n');

      // Wait for user confirmation
      await this.waitForUserInput();

      // Extract and save cookies
      spinner.start('Extracting authentication cookies...');
      const cookies = await this.extractAndSaveCookies();
      spinner.succeed(`Saved ${cookies.length} cookies`);

      console.log('\n✅ Setup complete!');
      console.log('   Your authentication cookies have been saved.');
      console.log('   You can now run the export command.\n');
    } catch (error) {
      spinner.fail('Setup failed');
      throw error;
    }
  }

  /**
   * Wait for user to press ENTER
   */
  private async waitForUserInput(): Promise<void> {
    return new Promise((resolve) => {
      process.stdin.once('data', () => {
        resolve();
      });
    });
  }

  /**
   * Extract cookies from the browser and save them
   */
  private async extractAndSaveCookies(): Promise<CookieData[]> {
    if (!this.browserManager) {
      throw new Error('Browser not initialized');
    }

    const page = this.browserManager.getPage();
    if (!page) {
      throw new Error('Browser page not available');
    }

    const cookieManager = this.browserManager.getCookieManager();

    // Extract cookies from the current page
    const cookies = await cookieManager.extractFromPage(page);

    if (cookies.length === 0) {
      throw new Error('No cookies found - make sure you are logged in');
    }

    // Save cookies to disk
    await cookieManager.saveCookies(cookies);

    return cookies;
  }
}

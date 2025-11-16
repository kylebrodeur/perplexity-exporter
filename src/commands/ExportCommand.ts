import fs from 'fs/promises';
import ora from 'ora';
import { BaseCommand } from './BaseCommand.js';

/**
 * Export command - exports all threads from Perplexity using browser script injection
 */
export class ExportCommand extends BaseCommand {
  async execute(): Promise<void> {
    const spinner = ora('Connecting to Chrome...').start();

    try {
      await this.initializeBrowser();
      spinner.succeed('✅ Connected to Chrome');

      if (!this.browserManager) {
        throw new Error('Browser not initialized');
      }

      // Wait for user to navigate and load threads
      spinner.stop();
      await this.browserManager.waitForUserReady();

      // Inject and run export script
      spinner.start('💉 Running export script...');
      const result = await this.browserManager.injectExportScript();

      // Print logs from browser
      result.log.forEach((line) => console.log('  ' + line));

      if (result.success && result.data) {
        spinner.succeed(`✅ Export complete! ${result.count} threads`);

        // Save to file
        const timestamp = Date.now();
        const filename = `perplexity-threads-${timestamp}.json`;
        await fs.writeFile(filename, JSON.stringify(result.data, null, 2));

        console.log(`\n📥 Saved to: ${filename}`);
        console.log(`\n📊 Summary:`);
        console.log(`   Total threads: ${result.count}`);
        const withDetails = (result.data as Array<{ messages?: unknown }>).filter(
          (t) => t.messages
        ).length;
        console.log(`   With full details: ${withDetails}`);
      } else {
        spinner.fail(`❌ Export failed: ${result.error}`);
      }
    } catch (error) {
      spinner.fail('Export failed');
      throw error;
    }
  }
}

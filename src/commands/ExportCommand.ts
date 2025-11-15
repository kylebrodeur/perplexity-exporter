import fs from 'fs/promises';
import path from 'path';
import ora, { type Ora } from 'ora';
import { BaseCommand } from './BaseCommand.js';
import type { PerplexityThread, Collection } from '../types/index.js';

/**
 * Export command - exports all threads and collections from Perplexity
 */
export class ExportCommand extends BaseCommand {
  async execute(): Promise<void> {
    const spinner = ora('Initializing browser...').start();

    try {
      await this.initializeBrowser();
      spinner.succeed('Browser initialized');

      if (!this.browserManager || !this.apiClient) {
        throw new Error('Browser not initialized');
      }

      // Navigate to Perplexity
      spinner.start('Opening Perplexity...');
      await this.browserManager.goto('https://www.perplexity.ai');
      spinner.succeed('Connected to Perplexity');

      // Export threads
      const threads = await this.exportThreads(spinner);

      // Export collections
      const collections = await this.exportCollections(spinner);

      // Save results
      await this.saveExportResults(threads, collections, spinner);

      spinner.succeed('✅ Export complete!');
      this.printSummary(threads.length, collections.length);
    } catch (error) {
      spinner.fail('Export failed');
      throw error;
    }
  }

  /**
   * Export all threads with progress tracking
   */
  private async exportThreads(spinner: Ora): Promise<PerplexityThread[]> {
    if (!this.apiClient) throw new Error('API client not initialized');

    spinner.start('Fetching threads list...');
    const threads = await this.apiClient.listThreads(this.exportConfig.maxThreads || 1000);
    spinner.succeed(`Found ${threads.length} threads`);

    if (!this.exportConfig.includeThreads) {
      spinner.info('Skipping thread details (includeThreads=false)');
      return threads;
    }

    spinner.start('Exporting thread details...');
    const detailedThreads: PerplexityThread[] = [];

    for (let i = 0; i < threads.length; i++) {
      const thread = threads[i];
      if (!thread) continue;

      const threadId = thread.id;

      spinner.text = `Exporting thread ${i + 1}/${threads.length}: ${thread.title || threadId}`;

      try {
        const detail = await this.apiClient.getThreadDetail(threadId);
        detailedThreads.push(detail);

        if (this.exportConfig.dryRun) {
          // In dry run, just fetch first few
          if (i >= 2) {
            spinner.info('Dry run mode - stopping after 3 threads');
            break;
          }
        }
      } catch (error) {
        spinner.warn(`Failed to export thread ${threadId}: ${error}`);
      }
    }

    spinner.succeed(`Exported ${detailedThreads.length} threads`);
    return detailedThreads;
  }

  /**
   * Export all collections with progress tracking
   */
  private async exportCollections(spinner: Ora): Promise<Collection[]> {
    if (!this.apiClient) throw new Error('API client not initialized');

    if (!this.exportConfig.includeCollections) {
      spinner.info('Skipping collections (includeCollections=false)');
      return [];
    }

    spinner.start('Fetching collections list...');
    const collections = await this.apiClient.listCollections(1000);
    spinner.succeed(`Found ${collections.length} collections`);

    spinner.start('Exporting collection details...');
    const detailedCollections: Collection[] = [];

    for (let i = 0; i < collections.length; i++) {
      const collection = collections[i];
      if (!collection) continue;

      const collectionId = collection.id;

      spinner.text = `Exporting collection ${i + 1}/${collections.length}: ${collection.name || collectionId}`;

      try {
        const detail = await this.apiClient.getCollectionDetail(collectionId);
        detailedCollections.push(detail);

        if (this.exportConfig.dryRun && i >= 2) {
          spinner.info('Dry run mode - stopping after 3 collections');
          break;
        }
      } catch (error) {
        spinner.warn(`Failed to export collection ${collectionId}: ${error}`);
      }
    }

    spinner.succeed(`Exported ${detailedCollections.length} collections`);
    return detailedCollections;
  }

  /**
   * Save export results to disk
   */
  private async saveExportResults(
    threads: PerplexityThread[],
    collections: Collection[],
    spinner: Ora
  ): Promise<void> {
    const outputDir = path.resolve(this.exportConfig.outputDir);

    spinner.start(`Saving results to ${outputDir}...`);

    // Create output directories
    await fs.mkdir(outputDir, { recursive: true });
    const threadsDir = path.join(outputDir, 'threads');
    const collectionsDir = path.join(outputDir, 'collections');
    await fs.mkdir(threadsDir, { recursive: true });
    await fs.mkdir(collectionsDir, { recursive: true });

    // Save individual thread files
    for (const thread of threads) {
      const filename = `thread_${thread.id}.json`;
      await fs.writeFile(path.join(threadsDir, filename), JSON.stringify(thread, null, 2));
    }

    // Save individual collection files
    for (const collection of collections) {
      const filename = `collection_${collection.id}.json`;
      await fs.writeFile(path.join(collectionsDir, filename), JSON.stringify(collection, null, 2));
    }

    // Save summary
    const summary = {
      exportDate: new Date().toISOString(),
      threads: {
        total: threads.length,
        items: threads.map((t) => ({ id: t.id, title: t.title })),
      },
      collections: {
        total: collections.length,
        items: collections.map((c) => ({ id: c.id, name: c.name })),
      },
    };

    await fs.writeFile(
      path.join(outputDir, 'export-summary.json'),
      JSON.stringify(summary, null, 2)
    );

    spinner.succeed('Results saved');
  }

  /**
   * Print export summary
   */
  private printSummary(threadCount: number, collectionCount: number): void {
    console.log('\n📊 Export Summary:');
    console.log(`   📝 Threads: ${threadCount}`);
    console.log(`   📁 Collections: ${collectionCount}`);
    console.log(`   📂 Output: ${this.exportConfig.outputDir}`);
    console.log('');
  }
}

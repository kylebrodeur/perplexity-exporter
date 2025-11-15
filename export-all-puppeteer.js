import fs from 'fs';
import path from 'path';
import { createStealthBrowser, handleCloudflareChallenge, PERPLEXITY_API, ENDPOINTS } from './browser-config-puppeteer.js';

async function exportAll() {
  console.log('🚀 Starting comprehensive Perplexity export (Puppeteer Stealth)...\n');

  // Check if browser data exists
  const hasBrowserData = fs.existsSync('./browser-data');
  if (!hasBrowserData) {
    console.log('⚠️  No browser data found!');
    console.log('   Please run "node setup-browser-puppeteer.js" first to:');
    console.log('   • Pass Cloudflare verification');
    console.log('   • Save your login session');
    console.log('   • Set up persistent browser profile\n');
    process.exit(1);
  }

  console.log('✅ Using saved browser profile from ./browser-data/');
  const { browser, page } = await createStealthBrowser(true);

  console.log('🌐 Opening Perplexity...');
  await page.goto(PERPLEXITY_API.BASE_URL, { waitUntil: 'networkidle2' });
  await page.waitForTimeout(2000);

  console.log('🔍 Checking authentication status...');
  await page.waitForTimeout(1000);

  console.log('✅ Ready to export!\n');

  // Auto-start export after 5 seconds
  console.log('💡 Starting export in 5 seconds (or press Ctrl+C to start now)...\n');
  await page.waitForTimeout(5000);

  console.log('📊 Fetching threads list...');
  
  try {
    // Navigate to API endpoint to get threads
    const threadsUrl = PERPLEXITY_API.buildUrl(ENDPOINTS.LIST_ALL_THREADS);
    await page.goto(threadsUrl, { waitUntil: 'networkidle2' });
    
    // Get the JSON response
    const threadsContent = await page.content();
    const threadsJson = extractJson(threadsContent);
    
    if (!threadsJson || !threadsJson.data) {
      throw new Error('Failed to fetch threads - may need to log in manually');
    }

    const threads = threadsJson.data;
    console.log(`✅ Found ${threads.length} threads\n`);

    // Create output directory
    const outputDir = './exported-data';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const threadsDir = path.join(outputDir, 'threads');
    if (!fs.existsSync(threadsDir)) {
      fs.mkdirSync(threadsDir, { recursive: true });
    }

    // Export each thread with full details
    console.log('📥 Exporting thread details...');
    const exportedThreads = [];

    for (let i = 0; i < threads.length; i++) {
      const thread = threads[i];
      const slug = thread.slug || thread.id;
      
      process.stdout.write(`   [${i + 1}/${threads.length}] ${thread.title || slug}...`);

      try {
        // Get full thread details
        const detailUrl = PERPLEXITY_API.buildUrl(ENDPOINTS.GET_THREAD_DETAIL(slug));
        await page.goto(detailUrl, { waitUntil: 'networkidle2' });
        const detailContent = await page.content();
        const detailJson = extractJson(detailContent);

        if (detailJson) {
          // Save individual thread file
          const filename = `thread_${slug}.json`;
          fs.writeFileSync(
            path.join(threadsDir, filename),
            JSON.stringify(detailJson, null, 2)
          );

          exportedThreads.push({
            slug,
            title: thread.title,
            file: filename,
            messages: detailJson.messages?.length || 0,
          });

          console.log(' ✅');
        } else {
          console.log(' ⚠️  (no data)');
        }
      } catch (error) {
        console.log(` ❌ (${error.message})`);
      }

      // Small delay to be nice to the server
      await page.waitForTimeout(500);
    }

    console.log('\n📊 Fetching collections list...');

    // Get collections
    const collectionsUrl = PERPLEXITY_API.buildUrl(ENDPOINTS.LIST_USER_COLLECTIONS);
    await page.goto(collectionsUrl, { waitUntil: 'networkidle2' });
    const collectionsContent = await page.content();
    const collectionsJson = extractJson(collectionsContent);

    if (!collectionsJson || !collectionsJson.data) {
      console.log('⚠️  No collections found or access denied');
    } else {
      const collections = collectionsJson.data;
      console.log(`✅ Found ${collections.length} collections\n`);

      const collectionsDir = path.join(outputDir, 'collections');
      if (!fs.existsSync(collectionsDir)) {
        fs.mkdirSync(collectionsDir, { recursive: true });
      }

      // Export each collection with full details
      console.log('📥 Exporting collection details...');
      const exportedCollections = [];

      for (let i = 0; i < collections.length; i++) {
        const collection = collections[i];
        const uuid = collection.uuid;

        process.stdout.write(`   [${i + 1}/${collections.length}] ${collection.name || uuid}...`);

        try {
          // Get full collection details
          const detailUrl = PERPLEXITY_API.buildUrl(ENDPOINTS.GET_COLLECTION_DETAIL(uuid));
          await page.goto(detailUrl, { waitUntil: 'networkidle2' });
          const detailContent = await page.content();
          const detailJson = extractJson(detailContent);

          if (detailJson) {
            // Save individual collection file
            const filename = `collection_${uuid}.json`;
            fs.writeFileSync(
              path.join(collectionsDir, filename),
              JSON.stringify(detailJson, null, 2)
            );

            exportedCollections.push({
              uuid,
              name: collection.name,
              file: filename,
              items: detailJson.threads?.length || 0,
            });

            console.log(' ✅');
          } else {
            console.log(' ⚠️  (no data)');
          }
        } catch (error) {
          console.log(` ❌ (${error.message})`);
        }

        await page.waitForTimeout(500);
      }

      // Save summary
      const summary = {
        exportDate: new Date().toISOString(),
        threads: {
          total: threads.length,
          exported: exportedThreads.length,
          items: exportedThreads,
        },
        collections: {
          total: collections.length,
          exported: exportedCollections.length,
          items: exportedCollections,
        },
      };

      fs.writeFileSync(
        path.join(outputDir, 'export-summary.json'),
        JSON.stringify(summary, null, 2)
      );

      console.log('\n✅ Export complete!');
      console.log(`\n📁 Results saved to: ${outputDir}/`);
      console.log(`   • ${exportedThreads.length} threads in threads/`);
      console.log(`   • ${exportedCollections.length} collections in collections/`);
      console.log(`   • Summary in export-summary.json\n`);
    }

  } catch (error) {
    console.error('\n❌ Export failed:', error.message);
    console.error('   You may need to run setup-browser-puppeteer.js again');
  } finally {
    await browser.close();
  }
}

/**
 * Extract JSON from page content (handles both pre-formatted and raw JSON)
 */
function extractJson(content) {
  try {
    // Try to extract from <pre> tag
    const preMatch = content.match(/<pre[^>]*>([\s\S]*?)<\/pre>/);
    if (preMatch) {
      return JSON.parse(preMatch[1]);
    }
    
    // Try to parse entire content as JSON
    return JSON.parse(content);
  } catch {
    return null;
  }
}

exportAll().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

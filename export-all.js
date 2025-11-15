import fs from 'fs';
import path from 'path';
import {
  createStealthBrowser,
  handleCloudflareChallenge,
  PERPLEXITY_API,
  ENDPOINTS,
} from './browser-config.js';

async function exportAll() {
  console.log('🚀 Starting comprehensive Perplexity export...\n');

  // Check if browser data exists
  const hasBrowserData = fs.existsSync('./browser-data');
  if (!hasBrowserData) {
    console.log('⚠️  No browser data found!');
    console.log('   Please run "node setup-browser.js" first to:');
    console.log('   • Pass Cloudflare verification');
    console.log('   • Save your login session');
    console.log('   • Set up persistent browser profile\n');
    process.exit(1);
  }

  console.log('✅ Using saved browser profile from ./browser-data/');
  const { browser, page } = await createStealthBrowser(false, true);

  console.log('🌐 Opening Perplexity...');
  await page.goto(PERPLEXITY_API.BASE_URL);
  await page.waitForTimeout(2000);

  console.log('🔍 Checking authentication status...');
  await page.waitForTimeout(1000);

  console.log('✅ Ready to export!\n');

  // Create output directory
  const outputDir = 'exported-data';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const exportData = {
    exportedAt: new Date().toISOString(),
    threads: [],
    collections: [],
    stats: {
      totalThreads: 0,
      totalCollections: 0,
      threadDetails: 0,
      collectionDetails: 0,
    },
  };

  // Wait for user signal to start export
  await new Promise((resolve) => {
    console.log('💡 Press Ctrl+C to start the export...\n');
    process.on('SIGINT', () => {
      console.log('\n\n🚀 Starting export...\n');
      resolve();
    });
    // Also auto-proceed after 10 seconds
    setTimeout(resolve, 10000);
  });

  // ========================================
  // STEP 1: Export All Threads
  // ========================================
  console.log('📡 Fetching thread list...');

  try {
    await page.goto(`${PERPLEXITY_API.BASE_URL}/library`, { waitUntil: 'networkidle' });
    await handleCloudflareChallenge(page);
    await page.waitForTimeout(2000);

    const response = await page.goto(PERPLEXITY_API.buildUrl(ENDPOINTS.LIST_ALL_THREADS), {
      waitUntil: 'networkidle',
    });

    const threadList = await response.json();
    console.log(`✅ Found ${threadList?.threads?.length || 0} threads\n`);

    exportData.stats.totalThreads = threadList?.threads?.length || 0;

    if (threadList?.threads) {
      // Save thread list
      fs.writeFileSync(`${outputDir}/thread-list.json`, JSON.stringify(threadList, null, 2));

      // Fetch details for each thread
      for (let i = 0; i < threadList.threads.length; i++) {
        const thread = threadList.threads[i];
        const slug = thread.slug || thread.uuid;

        console.log(`📥 [${i + 1}/${threadList.threads.length}] ${thread.title || slug}`);

        try {
          const detailUrl = PERPLEXITY_API.buildUrl(ENDPOINTS.GET_THREAD(slug), {
            with_parent_info: true,
            with_schematized_response: true,
            limit: 100,
            offset: 0,
            from_first: true,
          });

          const detailResponse = await page.goto(detailUrl, { waitUntil: 'networkidle' });
          const threadDetail = await detailResponse.json();

          exportData.threads.push({
            ...thread,
            detail: threadDetail,
            exportedAt: new Date().toISOString(),
          });

          exportData.stats.threadDetails++;

          // Save individual thread
          const sanitizedSlug = slug.replace(/[^a-zA-Z0-9-_]/g, '_');
          fs.writeFileSync(
            `${outputDir}/thread-${sanitizedSlug}.json`,
            JSON.stringify(threadDetail, null, 2)
          );

          console.log(`   ✅ Exported`);

          // Be nice to the server
          await page.waitForTimeout(500);
        } catch (error) {
          console.error(`   ❌ Error: ${error.message}`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error fetching threads:', error.message);
  }

  // ========================================
  // STEP 2: Export All Collections
  // ========================================
  console.log('\n📚 Fetching collections...');

  try {
    const response = await page.goto(
      PERPLEXITY_API.buildUrl(ENDPOINTS.LIST_USER_COLLECTIONS, { limit: 100, offset: 0 }),
      { waitUntil: 'networkidle' }
    );

    const collectionList = await response.json();
    console.log(`✅ Found ${collectionList?.collections?.length || 0} collections\n`);

    exportData.stats.totalCollections = collectionList?.collections?.length || 0;

    if (collectionList?.collections) {
      // Save collection list
      fs.writeFileSync(
        `${outputDir}/collection-list.json`,
        JSON.stringify(collectionList, null, 2)
      );

      // Fetch details for each collection
      for (let i = 0; i < collectionList.collections.length; i++) {
        const collection = collectionList.collections[i];
        const slug = collection.slug;

        console.log(
          `📥 [${i + 1}/${collectionList.collections.length}] ${collection.title || slug}`
        );

        try {
          // Get collection detail
          const detailUrl = PERPLEXITY_API.buildUrl(ENDPOINTS.GET_COLLECTION, {
            collection_slug: slug,
          });
          const detailResponse = await page.goto(detailUrl, { waitUntil: 'networkidle' });
          const collectionDetail = await detailResponse.json();

          // Get collection threads
          const threadsUrl = PERPLEXITY_API.buildUrl(ENDPOINTS.LIST_COLLECTION_THREADS, {
            collection_slug: slug,
            limit: 100,
            filter_by_user: true,
            filter_by_shared_threads: true,
            offset: 0,
          });
          const threadsResponse = await page.goto(threadsUrl, { waitUntil: 'networkidle' });
          const collectionThreads = await threadsResponse.json();

          exportData.collections.push({
            ...collection,
            detail: collectionDetail,
            threads: collectionThreads,
            exportedAt: new Date().toISOString(),
          });

          exportData.stats.collectionDetails++;

          // Save individual collection
          const sanitizedSlug = slug.replace(/[^a-zA-Z0-9-_]/g, '_');
          fs.writeFileSync(
            `${outputDir}/collection-${sanitizedSlug}.json`,
            JSON.stringify(
              {
                ...collectionDetail,
                threads: collectionThreads,
              },
              null,
              2
            )
          );

          console.log(`   ✅ Exported (${collectionThreads?.threads?.length || 0} threads)`);

          await page.waitForTimeout(500);
        } catch (error) {
          console.error(`   ❌ Error: ${error.message}`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error fetching collections:', error.message);
  }

  // ========================================
  // STEP 3: Save Summary
  // ========================================
  fs.writeFileSync(`${outputDir}/export-summary.json`, JSON.stringify(exportData, null, 2));

  console.log(`\n✅ Export complete!`);
  console.log(`\n📊 Summary:`);
  console.log(
    `   📝 Threads: ${exportData.stats.totalThreads} found, ${exportData.stats.threadDetails} exported`
  );
  console.log(
    `   📚 Collections: ${exportData.stats.totalCollections} found, ${exportData.stats.collectionDetails} exported`
  );
  console.log(`\n📁 Files saved to: ${outputDir}/`);
  console.log(`   • export-summary.json - Complete export data`);
  console.log(`   • thread-list.json - All threads list`);
  console.log(`   • thread-*.json - Individual thread details`);
  console.log(`   • collection-list.json - All collections list`);
  console.log(`   • collection-*.json - Individual collection details with threads`);

  await browser.close();
}

exportAll().catch(console.error);

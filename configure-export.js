import fs from 'fs';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function updateExportScript() {
  console.log('🔧 Export Script Configuration Helper\n');
  console.log(
    'This will help you update export-threads.js with the API endpoints you discovered.\n'
  );

  // Read analysis if available
  let analysis = null;
  if (fs.existsSync('analysis.json')) {
    analysis = JSON.parse(fs.readFileSync('analysis.json', 'utf-8'));
    console.log('📊 Found analysis.json with recommendations:\n');

    analysis.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec.type}:`);
      rec.endpoints.forEach((endpoint) => {
        console.log(`   ${endpoint}`);
      });
    });
    console.log('');
  }

  // Get list threads endpoint
  console.log('📝 Step 1: List Threads Endpoint\n');
  const listEndpoint = await question('Enter the LIST THREADS endpoint (e.g., /api/threads): ');
  const listMethod = (await question('HTTP method (default GET): ')) || 'GET';

  // Get thread detail endpoint
  console.log('\n📝 Step 2: Thread Detail Endpoint\n');
  const detailEndpoint = await question('Enter the GET THREAD endpoint (e.g., /api/thread/{id}): ');
  const detailMethod = (await question('HTTP method (default GET): ')) || 'GET';
  const idParam =
    (await question(
      'ID parameter name in URL (e.g., "id", or leave blank if ID goes in path): '
    )) || null;

  // Get sample response for list endpoint
  console.log('\n📝 Step 3: Response Structure\n');
  console.log('Look at captured-responses.json for the list endpoint response.');
  const threadsKey = await question(
    'What property contains the array of threads? (e.g., "threads", "data", "items"): '
  );
  const threadIdKey = await question(
    'What property contains each thread\'s ID? (e.g., "id", "threadId", "uuid"): '
  );

  // Build configuration
  const config = {
    endpoints: {
      listThreads: {
        path: listEndpoint,
        method: listMethod,
      },
      getThread: {
        path: detailEndpoint,
        method: detailMethod,
        idParam: idParam,
      },
    },
    responseStructure: {
      threadsArrayKey: threadsKey,
      threadIdKey: threadIdKey,
    },
  };

  // Save configuration
  fs.writeFileSync('export-config.json', JSON.stringify(config, null, 2));
  console.log('\n✅ Configuration saved to export-config.json\n');

  // Ask about headers
  console.log('📝 Step 4: Authentication Headers\n');
  console.log('Check captured-requests.json for headers like Authorization, Cookie, etc.\n');
  const needsHeaders = await question('Do you need to add custom headers? (y/n): ');

  if (needsHeaders.toLowerCase() === 'y') {
    console.log(
      "\nYou'll need to manually edit export-threads.js and add headers to AUTH_HEADERS."
    );
    console.log('Look for headers in captured-requests.json like:');
    console.log('  - Authorization');
    console.log('  - Cookie');
    console.log('  - X-* custom headers\n');
  }

  // Generate updated export script
  console.log('\n🔧 Generating updated export script...\n');

  const exportScript = generateExportScript(config);
  fs.writeFileSync('export-threads-configured.js', exportScript);

  console.log('✅ Generated export-threads-configured.js\n');
  console.log('📝 Next steps:');
  console.log('   1. Review export-threads-configured.js');
  console.log('   2. Add any required authentication headers');
  console.log('   3. Test with: node export-threads-configured.js');
  console.log('   4. If it works, replace export-threads.js with the configured version\n');

  rl.close();
}

function generateExportScript(config) {
  return `import { chromium } from 'playwright';
import fs from 'fs';

// Configuration (auto-generated)
const CONFIG = ${JSON.stringify(config, null, 2)};

// TODO: Add authentication headers from captured-requests.json
const AUTH_HEADERS = {
  // Example:
  // 'Authorization': 'Bearer YOUR_TOKEN',
  // 'Cookie': 'YOUR_COOKIES',
};

async function exportAllThreads() {
  console.log('🚀 Starting Perplexity thread export...\\n');

  const browser = await chromium.launch({
    headless: false
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('📝 Please log in to Perplexity...');
  await page.goto('https://www.perplexity.ai/');

  console.log('⏳ Waiting 20 seconds for login...');
  await page.waitForTimeout(20000);

  console.log('\\n📡 Fetching thread list...\\n');

  let allThreads = [];
  
  try {
    // Intercept the API response
    let listResponse = null;
    
    page.on('response', async response => {
      const url = response.url();
      if (url.includes(CONFIG.endpoints.listThreads.path)) {
        try {
          listResponse = await response.json();
        } catch (e) {
          console.error('Error parsing list response:', e.message);
        }
      }
    });

    // Navigate to trigger the list API call
    await page.goto('https://www.perplexity.ai/collections');
    await page.waitForTimeout(3000);

    if (listResponse) {
      // Extract threads array from response
      const threadsData = listResponse[CONFIG.responseStructure.threadsArrayKey] || listResponse;
      allThreads = Array.isArray(threadsData) ? threadsData : [threadsData];
      console.log(\`✅ Found \${allThreads.length} threads\\n\`);
    } else {
      console.error('❌ Could not find thread list in response');
      console.log('Check that the endpoint path is correct in export-config.json');
    }

  } catch (error) {
    console.error('❌ Error fetching threads:', error.message);
  }

  // Step 2: Download each thread's content
  const exportedThreads = [];

  for (let i = 0; i < allThreads.length; i++) {
    const thread = allThreads[i];
    const threadId = thread[CONFIG.responseStructure.threadIdKey];
    const threadTitle = thread.title || thread.name || \`Thread \${i + 1}\`;
    
    console.log(\`📥 [\${i + 1}/\${allThreads.length}] \${threadTitle}\`);

    try {
      let threadDetail = null;

      // Set up response interceptor
      page.on('response', async response => {
        const url = response.url();
        if (url.includes(threadId) || url.includes(CONFIG.endpoints.getThread.path)) {
          try {
            threadDetail = await response.json();
          } catch (e) {
            // Ignore parse errors
          }
        }
      });

      // Navigate to thread to trigger the detail API call
      const threadUrl = \`https://www.perplexity.ai/search/\${threadId}\`;
      await page.goto(threadUrl, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      if (threadDetail) {
        exportedThreads.push({
          ...threadDetail,
          exportedAt: new Date().toISOString()
        });
        console.log('   ✅ Downloaded');
      } else {
        // Fallback: save basic thread info
        exportedThreads.push({
          ...thread,
          exportedAt: new Date().toISOString(),
          note: 'Full detail not captured'
        });
        console.log('   ⚠️  Saved basic info only');
      }

      // Be nice to the server
      await page.waitForTimeout(1000);

    } catch (error) {
      console.error(\`   ❌ Error: \${error.message}\`);
    }
  }

  // Save results
  const outputDir = 'exported-threads';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  fs.writeFileSync(
    \`\${outputDir}/all-threads.json\`,
    JSON.stringify(exportedThreads, null, 2)
  );

  exportedThreads.forEach((thread, index) => {
    const threadId = thread[CONFIG.responseStructure.threadIdKey] || \`thread-\${index}\`;
    const sanitizedId = String(threadId).replace(/[^a-zA-Z0-9-_]/g, '_');
    const filename = \`\${outputDir}/\${sanitizedId}.json\`;
    fs.writeFileSync(filename, JSON.stringify(thread, null, 2));
  });

  console.log(\`\\n✅ Export complete!\`);
  console.log(\`   📁 Saved \${exportedThreads.length} threads to \${outputDir}/\`);
  console.log(\`   📄 Combined file: \${outputDir}/all-threads.json\`);

  await browser.close();
}

exportAllThreads().catch(console.error);
`;
}

updateExportScript().catch(console.error);

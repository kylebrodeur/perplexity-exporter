#!/usr/bin/env node

/**
 * Automated console script injection
 * 
 * Opens Chrome, you navigate to Perplexity Library, script auto-runs
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';

puppeteer.use(StealthPlugin());

async function autoInjectExport() {
  console.log('🚀 Automated Export with Console Script Injection\n');
  
  const userDataDir = path.resolve('./browser-data');
  
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    userDataDir: userDataDir,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--window-size=1920,1080',
      '--no-sandbox',
    ],
  });

  const pages = await browser.pages();
  const page = pages[0] || (await browser.newPage());
  
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('📋 Instructions:');
  console.log('   1. Browser opened - log in to Perplexity if needed');
  console.log('   2. Navigate to your Library/Threads page');
  console.log('   3. Scroll to load threads');
  console.log('   4. Come back here and press ENTER\n');

  await page.goto('https://www.perplexity.ai');
  
  await waitForEnter();
  
  console.log('\n💉 Injecting and running export script...\n');

  // Inject the export script
  const result = await page.evaluate(async () => {
    const log = [];
    
    // Get all thread links from the page
    const threadElements = document.querySelectorAll('a[href*="/search/"]');
    const threads = [];
    
    threadElements.forEach((el) => {
      const href = el.href;
      const title = el.textContent?.trim() || el.getAttribute('aria-label');
      
      if (href && title && href.includes('/search/')) {
        const match = href.match(/\/search\/([^/?]+)/);
        if (match) {
          threads.push({
            id: match[1],
            title: title,
            url: href,
            slug: match[1]
          });
        }
      }
    });
    
    // Remove duplicates
    const uniqueThreads = [...new Map(threads.map(t => [t.id, t])).values()];
    
    log.push(`Found ${uniqueThreads.length} threads`);
    
    if (uniqueThreads.length === 0) {
      return { success: false, log, error: 'No threads found' };
    }
    
    // Fetch details for each thread
    const detailedThreads = [];
    
    for (let i = 0; i < uniqueThreads.length; i++) {
      const thread = uniqueThreads[i];
      log.push(`[${i + 1}/${uniqueThreads.length}] ${thread.title}`);
      
      try {
        const response = await fetch(`https://www.perplexity.ai/rest/thread/${thread.slug}`);
        if (response.ok) {
          const data = await response.json();
          detailedThreads.push(data);
          log.push(`  ✅ ${data.messages?.length || 0} messages`);
        } else {
          log.push(`  ⚠️ Failed (${response.status})`);
          detailedThreads.push(thread);
        }
        
        // Small delay
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        log.push(`  ❌ Error: ${error.message}`);
        detailedThreads.push(thread);
      }
    }
    
    return { 
      success: true, 
      log, 
      data: detailedThreads,
      count: detailedThreads.length 
    };
  });

  // Print logs from browser
  result.log.forEach(line => console.log('  ' + line));

  if (result.success) {
    console.log(`\n✅ Export complete! ${result.count} threads\n`);
    
    // Save to file
    const timestamp = Date.now();
    const filename = `perplexity-threads-${timestamp}.json`;
    await fs.writeFile(filename, JSON.stringify(result.data, null, 2));
    
    console.log(`📥 Saved to: ${filename}`);
    console.log(`\n📊 Summary:`);
    console.log(`   Total threads: ${result.count}`);
    console.log(`   With full details: ${result.data.filter(t => t.messages).length}`);
  } else {
    console.log(`\n❌ Export failed: ${result.error}`);
  }

  console.log('\n✅ Done! Closing browser in 5 seconds...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  await browser.close();
}

function waitForEnter() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    rl.question('Press ENTER when ready... ', () => {
      rl.close();
      resolve(null);
    });
  });
}

autoInjectExport().catch(console.error);
